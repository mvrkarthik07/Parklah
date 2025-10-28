export default function Toast({ msg }: { msg: string }) {
return <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-900
text-white px-3 py-2 rounded">{msg}</div>
}