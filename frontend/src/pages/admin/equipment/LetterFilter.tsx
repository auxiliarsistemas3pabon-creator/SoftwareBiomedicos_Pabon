import { Button } from "@/components/ui/Button";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

interface LetterFilterProps {
    value:string;
    onChange: (letter:string) => void;
}

export default function LetterFilter({value,onChange}:LetterFilterProps) {
  return (
    <div className="flex flex-wrap gap-1">
      <Button size="sm" variant={value === "" ? "primary" : "secondary" } onClick={() => onChange("")}>
        Todas
      </Button>
      {LETTERS.map((l) => (
        <Button key={l} size="sm" variant={value === l ? "primary" : "secondary"} onClick={() => onChange(l)}>
            {l}
        </Button>
      ))}
    </div>
  )
}
