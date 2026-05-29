import { useInputStore } from "../stores/inputStore";
import { lettersOf } from "../engine/t9";
import { KeyButton } from "./KeyButton";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

/** 手机式九宫格（1–9）。 */
export function Keypad() {
  const appendNumber = useInputStore((s) => s.appendNumber);

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {KEYS.map((digit) => {
        const letters = lettersOf(digit);
        return (
          <KeyButton
            key={digit}
            onPress={() => appendNumber(digit)}
            className="h-[52px]"
            aria-label={letters ? `${digit} ${letters}` : digit}
          >
            <span className="flex flex-col items-center justify-center leading-none">
              <span className="text-[19px] font-medium text-ink">{digit}</span>
              <span className="mt-1 h-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-dim">
                {letters}
              </span>
            </span>
          </KeyButton>
        );
      })}
    </div>
  );
}
