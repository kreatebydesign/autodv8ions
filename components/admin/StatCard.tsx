export default function StatCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="dash-stat">
      <p className="dash-stat-label">{label}</p>
      <p className="dash-stat-value">{value}</p>
    </div>
  );
}
