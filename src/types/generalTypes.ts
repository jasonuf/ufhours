import * as z from "zod";

export type FailedLocation = {
  id?: string;
  name?: string;
};

// For each location, we either have valid data or attempt to identify the failed locations (if structure of data is incorrect)
// If endpoint fails, we return an error with kind and message
export type Result<T> =
  | {
      ok: true;
      data: (T | FailedLocation)[];
    }
  | {
      ok: false;
      error: {
        kind: "network" | "upstream" | "validation";
        message: string;
      };
    };
