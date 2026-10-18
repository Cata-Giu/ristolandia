import rules from '../../shared/service-rounds.json';
export function serviceRoundLabel(round?: number) {
  return round == null ? 'Uscita non specificata' : `${round}ª uscita`;
}
export function ServiceRoundSelect({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (round: number) => void;
  label: string;
}) {
  return (
    <label className="service-round-select">
      <span>{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {Array.from({ length: rules.max }, (_, i) => i + rules.min).map(
          (round) => (
            <option key={round} value={round}>
              {serviceRoundLabel(round)}
            </option>
          ),
        )}
      </select>
    </label>
  );
}
