export const getRole = (name: string) => {
    if (name === 'Listener') return 'listener'
    if (name === 'Whisper') return 'whisper'
    if (name.includes('Psikolog') || name.includes('Agent')) return 'agent'
    return 'client'
}