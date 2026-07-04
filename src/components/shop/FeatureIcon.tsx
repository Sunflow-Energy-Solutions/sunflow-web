import { Check, Minus } from "lucide-react";

export default function FeatureIcon({ active, label }: { active: boolean; label: string }) {
  return active ? (
    <Check className="h-4.5 w-4.5 text-solar-600" aria-label={`${label}: yes`} />
  ) : (
    <Minus className="h-4.5 w-4.5 text-mist-300" aria-label={`${label}: no`} />
  );
}
