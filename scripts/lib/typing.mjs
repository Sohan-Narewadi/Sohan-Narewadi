const enc = (s) => encodeURIComponent(s).replace(/%20/g, '+');

export function typingUrl(lines) {
  const joined = lines.map((l) => enc(String(l).replace(/;/g, ','))).join(';');
  const params = [
    'font=Segoe+UI', 'weight=600', 'size=22', 'duration=3200', 'pause=1200',
    'color=0D9488', 'center=true', 'vCenter=true', 'width=760', 'height=48',
    `lines=${joined}`,
  ];
  return `https://readme-typing-svg.demolab.com?${params.join('&')}`;
}
