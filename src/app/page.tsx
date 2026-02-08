export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <section className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-3xl font-semibold">Workload Management</h1>
        <p className="text-slate-600">
          社員の工数を月次で管理し、スプレッドシート感覚で入力できるアプリです。
        </p>
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
          まずは認証、マスタ管理、月次入力UI、Google Sheets出力を実装していきます。
        </div>
      </section>
    </main>
  );
}
