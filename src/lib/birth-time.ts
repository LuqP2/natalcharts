import { Temporal } from "@js-temporal/polyfill";

export type BirthTimeResolution =
  | { status: "valid"; instantUtc: string }
  | { status: "ambiguous"; earlierUtc: string; laterUtc: string }
  | { status: "nonexistent" }
  | { status: "invalid"; message: string };

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("pt-BR", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function resolveBirthTime(
  date: string,
  time: string,
  timeZone: string,
  disambiguation?: "earlier" | "later",
): BirthTimeResolution {
  if (!isValidTimeZone(timeZone)) {
    return { status: "invalid", message: "O fuso IANA informado não é válido." };
  }

  try {
    const plain = Temporal.PlainDateTime.from(`${date}T${time}`);
    const earlier = plain.toZonedDateTime(timeZone, {
      disambiguation: "earlier",
    });
    const later = plain.toZonedDateTime(timeZone, {
      disambiguation: "later",
    });
    const earlierMatches = earlier.toPlainDateTime().equals(plain);
    const laterMatches = later.toPlainDateTime().equals(plain);

    if (!earlierMatches && !laterMatches) {
      return { status: "nonexistent" };
    }

    const earlierUtc = earlier.toInstant().toString();
    const laterUtc = later.toInstant().toString();
    const isAmbiguous =
      earlierMatches && laterMatches && earlier.epochNanoseconds !== later.epochNanoseconds;

    if (isAmbiguous && !disambiguation) {
      return { status: "ambiguous", earlierUtc, laterUtc };
    }

    return {
      status: "valid",
      instantUtc: disambiguation === "later" ? laterUtc : earlierUtc,
    };
  } catch {
    return {
      status: "invalid",
      message: "Confira a data e a hora de nascimento.",
    };
  }
}
