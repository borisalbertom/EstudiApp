export function iconoMaterial(nombreArchivo) {
  const ext = (nombreArchivo.split('.').pop() || '').toLowerCase()
  if (ext === 'pdf') return '📕'
  if (['doc', 'docx'].includes(ext)) return '📝'
  if (['ppt', 'pptx'].includes(ext)) return '📊'
  if (['xls', 'xlsx'].includes(ext)) return '📈'
  if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) return '🎬'
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return '🖼️'
  return '📄'
}
