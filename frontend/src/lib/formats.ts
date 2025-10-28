export const fmtTimeSGT = (d: string | number | Date) => {
const dt = new Date(d)
return dt.toLocaleString('en-SG', { timeZone: 'Asia/Singapore' })
}
