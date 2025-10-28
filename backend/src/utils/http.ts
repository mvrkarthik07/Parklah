export function ok(data: any) { return { success: true, data } }
export function err(message: string, code = 'ERR') { return { success: false,
error: { code, message } } }
