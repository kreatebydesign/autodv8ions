export default function StatCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="admin-panel p-5">
      <p className="admin-label">{label}</p>
      <p className="mt-2 text-3xl font-light tracking-tight">{value}</p>
    </div>
  );
}
