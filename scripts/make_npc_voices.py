#!/usr/bin/env python3
"""Record every NPC line with Piper (v1.97.86). Run by .github/workflows/npc-voices.yml; also runs on a PC.

    node scripts/npc_voice_lines.cjs build/npc_lines.json
    python scripts/make_npc_voices.py build/npc_lines.json

Needs: pip install piper-tts numpy, and ffmpeg (Opus). The voice model downloads itself into build/piper/ the first time.

What it does
  1. Audition (only when assets/voices/audition/audition.json is missing, or with --audition): the model has hundreds of speakers.
     Each one says a test sentence; its pitch and how clean it sounds are measured; the cleanest deep men (Rick, Vern) and the
     cleanest women (Brenda, Tammy) are saved as samples for test/voice-audition.html, ranked best first.
  2. Each person's voice comes from scripts/npc_voices.json: a speaker number, or "auto" = the best audition pick for that role
     (Vern the deepest of the men, Rick the next; Tammy the higher of the women, Brenda the other).
  3. Every line in npc_lines.json becomes assets/voices/<who>/<key>.ogg (mono Opus, silence trimmed). Lines already recorded with
     the same voice are kept; changing someone's voice re-records all of theirs; clips for lines that are gone are deleted.
  4. assets/voices/index.json lists them, with a "rev" per person (changes when their voice does) for the game's cache.
"""
import argparse, hashlib, json, os, shutil, subprocess, sys, tempfile, wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
GEN = 1   # bump to re-record everything (e.g. after changing the trimming or encoding below)
PROBE = "Hey, the yeast cooler is getting hot. Somebody go shut those doors, okay?"
ROLE_SAMPLES = {
    'op': "Yeah? Make it useful. The plant does not run on conversation.",
    'vern': "Belt's tracking left. Keep the pit clear.",
    'brenda': "Make it quick. Trucks are waiting. If this is about corn, go ask Vern.",
    'tammy': "Hey! What's up? Just getting these trucks out, then I get to go home.",
}
WHO = ['op', 'brenda', 'tammy', 'vern']


# ----------------------------------------------------------------------------------------------------------------- synthesis
class Synth:
    def __init__(self, model, models_dir, fake=False):
        self.fake = fake
        if fake:
            self.rate, self.speakers = 22050, 40
            return
        from piper import PiperVoice
        onnx = Path(models_dir) / (model + '.onnx')
        if not onnx.exists():
            Path(models_dir).mkdir(parents=True, exist_ok=True)
            subprocess.run([sys.executable, '-m', 'piper.download_voices', '--download-dir', str(models_dir), model], check=True)
        self.voice = PiperVoice.load(str(onnx))
        self.rate = self.voice.config.sample_rate
        self.speakers = max(1, int(self.voice.config.num_speakers or 1))
        self.speaker_map = getattr(self.voice.config, 'speaker_id_map', None) or {}

    def say(self, text, speaker, length_scale=1.0):
        """float32 mono samples in [-1, 1]"""
        if self.fake:   # a stand-in for testing the pipeline without a model: a hum per word, pitch from the speaker
            f0 = 90 + (speaker * 37) % 160
            parts = []
            for w in text.split():
                n = int(self.rate * (0.12 + 0.03 * len(w)) * length_scale)
                t = np.arange(n) / self.rate
                parts += [0.4 * np.sin(2 * np.pi * f0 * t) * np.hanning(n), np.zeros(int(self.rate * 0.05))]
            return np.concatenate([np.zeros(2000)] + parts + [np.zeros(3000)]).astype(np.float32)
        from piper import SynthesisConfig
        cfg = SynthesisConfig(speaker_id=int(speaker), length_scale=float(length_scale), normalize_audio=True)
        chunks = [c.audio_float_array for c in self.voice.synthesize(text, syn_config=cfg)]
        return np.concatenate(chunks).astype(np.float32) if chunks else np.zeros(1, np.float32)


def trim(x, rate, pad=0.03):
    """cut the silence before and after the speech, leaving a short pad"""
    if len(x) < 10:
        return x
    frame = int(rate * 0.01)
    n = len(x) // frame
    if n < 3:
        return x
    e = np.sqrt((x[:n * frame].reshape(n, frame) ** 2).mean(1))
    thr = max(e.max() * 0.02, 1e-4)
    on = np.nonzero(e > thr)[0]
    if not len(on):
        return x
    a = max(0, on[0] * frame - int(pad * rate))
    b = min(len(x), (on[-1] + 1) * frame + int(pad * rate))
    return x[a:b]


def write_ogg(x, rate, dest, kbps=24):
    dest.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        tmp = f.name
    try:
        with wave.open(tmp, 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate)
            w.writeframes((np.clip(x, -1, 1) * 32767).astype('<i2').tobytes())
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-ac', '1', '-c:a', 'libopus', '-b:a', f'{kbps}k',
                        '-application', 'voip', str(dest)], check=True)
    finally:
        os.unlink(tmp)


# ----------------------------------------------------------------------------------------------------------------- audition
def measure(x, rate):
    """(median pitch Hz, clarity 0..1): pitch from autocorrelation of voiced 40 ms frames; clarity = how periodic the voiced
    frames are (noisy / buzzy / tinny voices score lower)"""
    n = int(rate * 0.04)
    hop = n // 2
    lo, hi = int(rate / 320), int(rate / 65)
    f0s, clar = [], []
    peak = np.abs(x).max() + 1e-9
    for i in range(0, len(x) - n, hop):
        f = x[i:i + n]
        if np.sqrt((f ** 2).mean()) < 0.08 * peak:
            continue
        f = f - f.mean()
        ac = np.correlate(f, f, 'full')[n - 1:]
        if ac[0] <= 0:
            continue
        ac = ac / ac[0]
        k = lo + int(np.argmax(ac[lo:hi]))
        if ac[k] > 0.45:
            f0s.append(rate / k)
            clar.append(ac[k])
    if len(f0s) < 5:
        return 0.0, 0.0
    return float(np.median(f0s)), float(np.mean(clar))


AUDITION_PICK = 2   # bump when the way roles are picked changes: the picks are redone from the saved measurements
ROLE_PITCH = {'vern': (82, 108), 'op': (100, 126), 'brenda': (172, 212), 'tammy': (205, 250)}   # Hz: deep / low-middle men, lower / higher women


def pick_roles(rows, per_role=8):
    """the cleanest speakers in each role's pitch range. Clarity reads higher for higher voices, so each speaker is compared with
    the speakers within 10 Hz of it (how much cleaner than its neighbours), not with everyone."""
    def residual(r):
        near = sorted(q['clarity'] for q in rows if q['f0'] and abs(q['f0'] - r['f0']) <= 10)
        return r['clarity'] - near[len(near) // 2]
    scored = [dict(r, score=round(residual(r), 3)) for r in rows if r['f0']]
    roles, used = {}, set()
    for who in ['vern', 'op', 'tammy', 'brenda']:
        lo, hi = ROLE_PITCH[who]
        c = sorted([r for r in scored if lo <= r['f0'] <= hi and r['speaker'] not in used], key=lambda r: -r['score'])[:per_role]
        used.update(r['speaker'] for r in c[:1])
        roles[who] = c
    return roles


def audition_samples(synth, out_dir, roles):
    for d in ('op', 'vern', 'brenda', 'tammy'):
        if (out_dir / d).exists():
            shutil.rmtree(out_dir / d)
    for who, cands in roles.items():
        for r in cands:
            write_ogg(trim(synth.say(ROLE_SAMPLES[who], r['speaker']), synth.rate), synth.rate, out_dir / who / f"{r['speaker']}.ogg")


def audition(synth, out_dir, per_role=8):
    """measure every speaker, keep the best candidates per role, save their samples"""
    rows = []
    for sp in range(synth.speakers):
        x = trim(synth.say(PROBE, sp), synth.rate)
        f0, c = measure(x, synth.rate)
        rows.append({'speaker': sp, 'f0': round(f0, 1), 'clarity': round(c, 3)})
        if sp % 100 == 0:
            print(f'  audition {sp}/{synth.speakers}', flush=True)
    roles = pick_roles(rows, per_role)
    if out_dir.exists():
        shutil.rmtree(out_dir)
    audition_samples(synth, out_dir, roles)
    data = {'pick': AUDITION_PICK, 'probe': PROBE, 'samples': ROLE_SAMPLES, 'roles': roles, 'all': rows}
    (out_dir / 'audition.json').write_text(json.dumps(data, indent=1))
    return data


# ----------------------------------------------------------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('lines', nargs='?', default=str(ROOT / 'build/npc_lines.json'))
    ap.add_argument('--config', default=str(ROOT / 'scripts/npc_voices.json'))
    ap.add_argument('--out', default=str(ROOT / 'assets/voices'))
    ap.add_argument('--models', default=str(ROOT / 'build/piper'))
    ap.add_argument('--audition', action='store_true', help='redo the audition even if one exists')
    ap.add_argument('--fake', action='store_true', help='hums instead of Piper (testing the pipeline only)')
    args = ap.parse_args()

    cfg = json.loads(Path(args.config).read_text())
    lines = json.loads(Path(args.lines).read_text())['lines']
    out = Path(args.out)
    synth = Synth(cfg['model'], args.models, fake=args.fake)

    aud_path = out / 'audition' / 'audition.json'
    if args.audition or not aud_path.exists():
        print(f'Audition: {synth.speakers} speakers', flush=True)
        aud = audition(synth, out / 'audition')
    else:
        aud = json.loads(aud_path.read_text())
        if aud.get('pick') != AUDITION_PICK:   # new way of picking: redo the picks from the saved measurements, and their samples
            print('Audition: re-picking from the saved measurements', flush=True)
            aud['roles'] = pick_roles(aud['all'])
            aud['pick'] = AUDITION_PICK
            aud['samples'] = ROLE_SAMPLES
            audition_samples(synth, out / 'audition', aud['roles'])
            aud_path.write_text(json.dumps(aud, indent=1))

    idx_path = out / 'index.json'
    old = json.loads(idx_path.read_text()) if idx_path.exists() else {'voices': {}}
    index = {'v': 1, 'model': cfg['model'], 'voices': {}}
    made = kept = gone = 0
    for who in WHO:
        vc = cfg['voices'][who]
        sp = vc.get('speaker', 'auto')
        if sp == 'auto':
            pick = (aud['roles'].get(who) or [{}])[0].get('speaker')
            if pick is None:
                raise SystemExit(f'no audition pick for {who}: set a speaker number in {args.config}')
            sp = pick
        ls = float(vc.get('length_scale', 1.0))
        rev = hashlib.sha1(f"{GEN}|{cfg['model']}|{sp}|{ls}|{'fake' if args.fake else 'piper'}".encode()).hexdigest()[:8]
        d = out / who
        same_voice = old.get('voices', {}).get(who, {}).get('rev') == rev
        if not same_voice and d.exists():
            shutil.rmtree(d)
        want = {l['key']: l['text'] for l in lines.get(who, [])}
        have = {p.stem for p in d.glob('*.ogg')} if d.exists() else set()
        for k in sorted(have - set(want)):
            (d / f'{k}.ogg').unlink(); gone += 1
        todo = [k for k in want if k not in have]
        print(f'{who}: speaker {sp}, {len(want)} lines, {len(todo)} to record', flush=True)
        for i, k in enumerate(todo):
            write_ogg(trim(synth.say(want[k], sp, ls), synth.rate), synth.rate, d / f'{k}.ogg')
            made += 1
            if i % 100 == 99:
                print(f'  {who} {i + 1}/{len(todo)}', flush=True)
        kept += len(want) - len(todo)
        index['voices'][who] = {'speaker': sp, 'length_scale': ls, 'rev': rev, 'clips': sorted(want)}
    idx_path.write_text(json.dumps(index, separators=(',', ':')))
    size = sum(p.stat().st_size for p in out.rglob('*.ogg') if 'audition' not in p.parts)
    print(f'Voices: {made} recorded, {kept} kept, {gone} removed; clips total {size / 1e6:.2f} MB')


if __name__ == '__main__':
    main()
