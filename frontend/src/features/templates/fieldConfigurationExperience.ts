export function fieldConfigurationExperience(detectedFieldCount: number) {
  return detectedFieldCount > 0 ? 'FORM_FIELDS' : 'VISUAL_EDITOR'
}
