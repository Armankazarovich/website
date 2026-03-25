import React from "react";
import path from "path";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
  renderToBuffer,
} from "@react-pdf/renderer";

// Roboto с кириллицей — локальные WOFF файлы из public/fonts/
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
  page: { fontFamily: "Roboto", fontSize: 10, padding: 40, color: "#1a1a1a" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#E8700A",
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 40, height: 40, objectFit: "contain" },
  company: { fontSize: 20, fontWeight: 700, color: "#5C3317" },
  companyInfo: { fontSize: 8, color: "#666", marginTop: 4, lineHeight: 1.6 },
  invoiceTitle: { fontSize: 18, fontWeight: 700, textAlign: "right", color: "#E8700A" },
  invoiceMeta: { fontSize: 9, color: "#666", textAlign: "right", marginTop: 4, lineHeight: 1.6 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 8, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 },
  customerBlock: { backgroundColor: "#f9f9f9", padding: 12, borderRadius: 6 },
  customerName: { fontSize: 12, fontWeight: 700, marginBottom: 4 },
  customerInfo: { fontSize: 9, color: "#555", lineHeight: 1.7 },
  metaRow: { flexDirection: "row", gap: 24, marginBottom: 16 },
  metaItem: { fontSize: 9, color: "#555" },
  metaLabel: { fontWeight: 700, color: "#333" },
  table: { marginTop: 8 },
  tableHeader: { flexDirection: "row", backgroundColor: "#5C3317", padding: 8, borderRadius: 4, marginBottom: 1 },
  tableHeaderCell: { color: "#fff", fontWeight: 700, fontSize: 9 },
  tableRow: { flexDirection: "row", padding: "7 8", borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  tableRowAlt: { backgroundColor: "#fafafa" },
  colName: { flex: 3 },
  colSize: { flex: 1.5, textAlign: "center" },
  colQty: { flex: 1, textAlign: "center" },
  colPrice: { flex: 1.2, textAlign: "right" },
  colTotal: { flex: 1.2, textAlign: "right" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: "#E8700A",
  },
  totalLabel: { fontSize: 12, fontWeight: 700, marginRight: 16 },
  totalAmount: { fontSize: 16, fontWeight: 700, color: "#E8700A" },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  footerText: { fontSize: 8, color: "#bbb" },
});

export type InvoiceOrder = {
  orderNumber: number;
  createdAt: Date | string;
  guestName?: string | null;
  guestPhone?: string | null;
  guestEmail?: string | null;
  deliveryAddress?: string | null;
  paymentMethod?: string | null;
  comment?: string | null;
  totalAmount: number | string;
  deliveryCost?: number | string | null;
  items: Array<{
    productName: string;
    variantSize: string;
    unitType: string;
    quantity: number | string;
    price: number | string;
  }>;
};

function InvoiceDocument({ order }: { order: InvoiceOrder }) {
  const date = new Date(order.createdAt).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <Document title={`Счёт №${order.orderNumber} — ПилоРус`}>
      <Page size="A4" style={styles.page}>
        {/* Шапка */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <Image src={LOGO} style={styles.logo} />
            <View>
              <Text style={styles.company}>ПилоРус</Text>
              <Text style={styles.companyInfo}>
                {"Пиломатериалы от производителя\n"}
                {"Химки, ул. Заводская 2А, стр.28\n"}
                {"Тел: 8-985-970-71-33 · pilo-rus.ru"}
              </Text>
            </View>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>СЧЁТ №{order.orderNumber}</Text>
            <Text style={styles.invoiceMeta}>{"Дата: " + date}</Text>
          </View>
        </View>

        {/* Клиент */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Клиент</Text>
          <View style={styles.customerBlock}>
            <Text style={styles.customerName}>{order.guestName || "Клиент"}</Text>
            <Text style={styles.customerInfo}>
              {order.guestPhone ? "Телефон: " + order.guestPhone + "\n" : ""}
              {order.guestEmail ? "Email: " + order.guestEmail + "\n" : ""}
              {order.deliveryAddress ? "Адрес доставки: " + order.deliveryAddress : ""}
            </Text>
          </View>
        </View>

        {/* Детали */}
        <View style={styles.metaRow}>
          <Text style={styles.metaItem}>
            <Text style={styles.metaLabel}>Оплата: </Text>
            {order.paymentMethod || "—"}
          </Text>
          {order.comment ? (
            <Text style={styles.metaItem}>
              <Text style={styles.metaLabel}>Комментарий: </Text>
              {order.comment}
            </Text>
          ) : null}
        </View>

        {/* Таблица товаров */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Состав заказа</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colName]}>Товар</Text>
              <Text style={[styles.tableHeaderCell, styles.colSize]}>Размер</Text>
              <Text style={[styles.tableHeaderCell, styles.colQty]}>Кол-во</Text>
              <Text style={[styles.tableHeaderCell, styles.colPrice]}>Цена</Text>
              <Text style={[styles.tableHeaderCell, styles.colTotal]}>Сумма</Text>
            </View>
            {order.items.map((item, i) => {
              const qty = Number(item.quantity);
              const price = Number(item.price);
              const unit = item.unitType === "CUBE" ? "м³" : "шт";
              return (
                <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                  <Text style={styles.colName}>{item.productName}</Text>
                  <Text style={styles.colSize}>{item.variantSize}</Text>
                  <Text style={styles.colQty}>{qty} {unit}</Text>
                  <Text style={styles.colPrice}>{price.toLocaleString("ru-RU")} руб.</Text>
                  <Text style={styles.colTotal}>{(qty * price).toLocaleString("ru-RU")} руб.</Text>
                </View>
              );
            })}
            {order.deliveryCost && Number(order.deliveryCost) > 0 ? (
              <View style={[styles.tableRow, { backgroundColor: "#f0f4ff" }]}>
                <Text style={styles.colName}>Доставка</Text>
                <Text style={styles.colSize}>—</Text>
                <Text style={styles.colQty}>—</Text>
                <Text style={styles.colPrice}>—</Text>
                <Text style={styles.colTotal}>{Number(order.deliveryCost).toLocaleString("ru-RU")} руб.</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>ИТОГО:</Text>
            <Text style={styles.totalAmount}>
              {Number(order.totalAmount).toLocaleString("ru-RU")} руб.
            </Text>
          </View>
        </View>

        {/* Подвал */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>ПилоРус — Химки, ул. Заводская 2А, стр.28 · 8-985-970-71-33</Text>
          <Text style={styles.footerText}>Спасибо за заказ! pilo-rus.ru</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function generateInvoicePdf(order: InvoiceOrder): Promise<Buffer> {
  const buf = await renderToBuffer(<InvoiceDocument order={order} />);
  return Buffer.from(buf);
}
