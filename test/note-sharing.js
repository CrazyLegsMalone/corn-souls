// Injected into the game's notes scope by the TEST loader.
function noteReport(n) {
  const kind = (NOTE_KIND[n.kind] || NOTE_KIND.msg)[1];
  return ['Corn Souls — ' + kind, 'From: ' + (n.name || 'anonymous'),
    'Date: ' + new Date(n.t).toISOString(), 'Build: ' + (n.v || 'unknown'),
    'Device: ' + n.dev, 'Location: ' + n.where,
    ...(n.held ? ['Holding: ' + n.held] : []), '', n.text].join('\n');
}
function noteScreenshot(n) {
  if (!n.img || !/^data:image\/jpeg;base64,/.test(n.img)) return null;
  try {
    const raw = atob(n.img.split(',')[1]), bytes = Uint8Array.from(raw, c => c.charCodeAt(0));
    return new File([bytes], 'corn-souls-note.jpg', {type:'image/jpeg'});
  } catch (e) { return null; }
}
function noteShareFallback(n, message) {
  modal('<h1>Share note</h1><p>' + escH(message || 'Copy this report, then text or email it to the developer.') +
    '</p><textarea id="noteReportText" readonly rows="10" style="width:100%;box-sizing:border-box">' +
    escH(noteReport(n)) + '</textarea><p>Notes stay on this device until you share them. Copying alone does not send them.</p>',
    [['Copy report', async () => {
      try { await navigator.clipboard.writeText(noteReport(n)); noteShareFallback(n, 'Report copied. Paste it into a message to the developer.'); }
      catch (e) { noteShareFallback(n, 'Select the report text and use Copy, then paste it into a message.');
        const field = $('noteReportText'); field.focus(); field.select(); }
    }], ...(n.img ? [['Download screenshot', () => {
      const a = document.createElement('a'); a.href = n.img; a.download = 'corn-souls-note.jpg';
      document.body.appendChild(a); a.click(); a.remove();
      noteShareFallback(n, 'Attach the downloaded screenshot to your message.');
    }]] : []), ['Close', null]], true);
}
async function noteShare(n) {
  if (!navigator.share) { noteShareFallback(n); return; }
  const data = {title:'Corn Souls feedback', text:noteReport(n)}, file = noteScreenshot(n);
  // Build the attachment synchronously so iOS retains the button's user activation.
  try {
    if (file && navigator.canShare && navigator.canShare({files:[file]})) data.files = [file];
    await navigator.share(data);
    toast('Share menu opened. Finish sending in your chosen app.');
  } catch (e) {
    if (e.name === 'AbortError') { toast('Sharing canceled. Your saved note is still on this device.'); return; }
    noteShareFallback(n, 'Sharing was unavailable. Copy the report and send it in a message.');
  }
}
function noteSaved(n) {
  modal('<h1>Note saved on this device</h1><p>The developer has not received it. Tap Share note, then choose Messages, Mail, or another app and send it to the developer.</p>',
    [['Share note', () => noteShare(n)], ['Keep on this device', null]], true);
}
