import React from "react";
import path from "path";
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { PRICE_LIST_UNITS, type PriceListData, type PriceListRow } from "@/lib/price-list-data";
import { DEFAULT_SETTINGS } from "@/lib/site-settings";

const FONTS_DIR = path.join(process.cwd(), "public", "fonts");
Font.register({
  family: "Roboto",
  fonts: [
    { src: path.join(FONTS_DIR, "Roboto-Regular.woff"), fontWeight: 400 },
    { src: path.join(FONTS_DIR, "Roboto-Bold.woff"), fontWeight: 700 },
  ],
});

const LOGO = path.join(process.cwd(), "public", "logo.png");

const styles = StyleSheet.create({
  page: { fontFamily: "Roboto", fontSize: 8.5, padding: 24, color: "#1f1711" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 20,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#E8700A",
    marginBottom: 12,
  },
  brand: { flexDirection: "row", gap: 9, alignItems: "center" },
  logo: { width: 34, height: 34, objectFit: "contain" },
  brandName: { fontSize: 18, fontWeight: 700, color: "#5C3317" },
  brandMeta: { marginTop: 3, fontSize: 8, lineHeight: 1.45, color: "#6f635b" },
  titleBlock: { alignItems: "flex-end" },
  title: { fontSize: 19, fontWeight: 700, color: "#E8700A" },
  meta: { marginTop: 4, fontSize: 8, color: "#6f635b", lineHeight: 1.45, textAlign: "right" },
  stats: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  stat: {
    padding: "6 8",
    borderWidth: 1,
    borderColor: "#ead8ca",
    borderRadius: 6,
    backgroundColor: "#fff7ef",
  },
  statText: { fontSize: 8, color: "#5C3317", fontWeight: 700 },
  note: {
    marginBottom: 10,
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#f7f1eb",
    color: "#5c514a",
    lineHeight: 1.4,
  },
  categoryTitle: {
    marginTop: 10,
    marginBottom: 4,
    fontSize: 11,
    fontWeight: 700,
    color: "#5C3317",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#5C3317",
    borderRadius: 4,
    padding: "5 6",
    color: "#fff",
    fontWeight: 700,
  },
  row: {
    flexDirection: "row",
    padding: "5 6",
    borderBottomWidth: 1,
    borderBottomColor: "#eee4dc",
  },
  rowAlt: { backgroundColor: "#fffaf5" },
  colProduct: { width: "31%" },
  colSize: { width: "19%" },
  colGrade: { width: "10%" },
  colPrice: { width: "12%", textAlign: "right" },
  colStock: { width: "8%", textAlign: "right" },
  small: { fontSize: 7, color: "#766b63", lineHeight: 1.35 },
  productName: { fontWeight: 700, lineHeight: 1.25 },
  footer: {
    position: "absolute",
    bottom: 14,
    left: 24,
    right: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#ead8ca",
    paddingTop: 6,
  },
  footerText: { fontSize: 7, color: "#8a7c70" },
});

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatRub(value: number | null) {
  if (!value) return "—";
  return `${Math.round(value).toLocaleString("ru-RU")} руб.`;
}

function priceFor(row: PriceListRow, unit: keyof typeof PRICE_LIST_UNITS) {
  return row.availableUnits.find((entry) => entry.unit === unit)?.price ?? null;
}

function PriceRow({ row, index }: { row: PriceListRow; index: number }) {
  return (
    <View style={[styles.row, index % 2 === 1 ? styles.rowAlt : {}]} wrap={false}>
      <View style={styles.colProduct}>
        <Text style={styles.productName}>{row.productName}</Text>
        <Text style={styles.small}>{row.categoryName}</Text>
      </View>
      <Text style={styles.colSize}>{row.displaySize}</Text>
      <Text style={styles.colGrade}>{row.grade || "—"}</Text>
      <Text style={styles.colPrice}>{formatRub(priceFor(row, "CUBE"))}</Text>
      <Text style={styles.colPrice}>{formatRub(priceFor(row, "SQUARE"))}</Text>
      <Text style={styles.colPrice}>{formatRub(priceFor(row, "PIECE"))}</Text>
      <Text style={styles.colStock}>{row.stockQty == null ? "есть" : row.stockQty.toLocaleString("ru-RU")}</Text>
    </View>
  );
}

function PriceListDocument({ data }: { data: PriceListData }) {
  return (
    <Document title="Прайс-лист ПилоРус">
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header} fixed>
          <View style={styles.brand}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- React PDF Image does not support alt. */}
            <Image src={LOGO} style={styles.logo} />
            <View>
              <Text style={styles.brandName}>ПилоРус</Text>
              <Text style={styles.brandMeta}>
                {`Пиломатериалы от производителя\nХимки, ул. Заводская 2А, стр.28\nТел.: ${DEFAULT_SETTINGS.phone} · pilo-rus.ru`}
              </Text>
            </View>
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>ПРАЙС-ЛИСТ</Text>
            <Text style={styles.meta}>
              {`Сформирован: ${formatDate(data.generatedAt)}\nПозиций: ${data.totalRows} · товаров: ${data.totalProducts}`}
            </Text>
          </View>
        </View>

        <View style={styles.stats}>
          <View style={styles.stat}><Text style={styles.statText}>Цены из живого каталога</Text></View>
          <View style={styles.stat}><Text style={styles.statText}>м³ / м² / шт без смешения единиц</Text></View>
          <View style={styles.stat}><Text style={styles.statText}>Для сметы, закупки и печати</Text></View>
        </View>

        <Text style={styles.note}>
          Цены актуальны на момент формирования PDF. Наличие, доставка и итоговая стоимость заказа уточняются менеджером перед отгрузкой.
        </Text>

        {data.groupedRows.map((group) => (
          <View key={group.category.slug}>
            <Text style={styles.categoryTitle}>{group.category.name}</Text>
            <View style={styles.tableHeader} fixed>
              <Text style={styles.colProduct}>Товар</Text>
              <Text style={styles.colSize}>Размер</Text>
              <Text style={styles.colGrade}>Сорт</Text>
              <Text style={styles.colPrice}>Цена / м³</Text>
              <Text style={styles.colPrice}>Цена / м²</Text>
              <Text style={styles.colPrice}>Цена / шт</Text>
              <Text style={styles.colStock}>Склад</Text>
            </View>
            {group.rows.map((row, index) => (
              <PriceRow key={row.key} row={row} index={index} />
            ))}
          </View>
        ))}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>ПилоРус · pilo-rus.ru · {DEFAULT_SETTINGS.phone}</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Страница ${pageNumber} из ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function generatePriceListPdf(data: PriceListData): Promise<Buffer> {
  const buffer = await renderToBuffer(<PriceListDocument data={data} />);
  return Buffer.from(buffer);
}
