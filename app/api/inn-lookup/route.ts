export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const inn = req.nextUrl.searchParams.get("inn");

  if (!inn || !/^\d{10}(\d{2})?$/.test(inn)) {
    return NextResponse.json({ error: "Неверный ИНН" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://egrul.itsoft.ru/${inn}.json`, {
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Организация не найдена" }, { status: 404 });
    }

    const data = await res.json();

    // ЮЛ (юридическое лицо)
    if (data.СвЮЛ) {
      const юл = data.СвЮЛ;
      const attrs = юл["@attributes"] || {};
      const наимЮЛ = юл.СвНаимЮЛ || {};
      const shortName = наимЮЛ.СвНаимЮЛСокр?.["@attributes"]?.НаимСокр || "";
      const fullName = наимЮЛ["@attributes"]?.НаимЮЛПолн || "";
      const name = shortName || fullName;
      const kpp = attrs.КПП || "";

      // Адрес
      const адрБлок = юл.СвАдресЮЛ;
      let address = "";
      if (адрБлок) {
        const адрАттр = адрБлок["@attributes"] || {};
        address = адрАттр.АдресПолн || адрАттр.СтрАдр || "";
        if (!address && адрБлок.АдрЮЛФИАС) {
          const фиас = адрБлок.АдрЮЛФИАС["@attributes"] || {};
          address = фиас.АдресПолн || "";
        }
      }

      return NextResponse.json({ name, kpp, address, inn });
    }

    // ИП (индивидуальный предприниматель)
    if (data.СвИП) {
      const ип = data.СвИП;
      const фио = ип.СвФЛ?.["@attributes"] || {};
      const name = `ИП ${[фио.Фамилия, фио.Имя, фио.Отчество].filter(Boolean).join(" ")}`;
      return NextResponse.json({ name, kpp: "", address: "", inn });
    }

    return NextResponse.json({ error: "Организация не найдена" }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Ошибка запроса" }, { status: 500 });
  }
}
