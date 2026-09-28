import { data } from "react-router";

export const loader = async () =>
  data(
    {
      ok: true,
      service: "central-de-reservas-pmy",
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
