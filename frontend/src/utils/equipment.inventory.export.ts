import type { Equipment } from "@/types/equipment/equipment";

const COLUMNS: { header: string; value: (eq: Equipment) => string | number | null | undefined }[] = [
  { header: "Nombre", value: (eq) => eq.name },
  { header: "Asset tag", value: (eq) => eq.asset_tag },
  { header: "Código interno", value: (eq) => eq.internal_code },
  { header: "Serie", value: (eq) => eq.serial },
  { header: "Id software", value: (eq) => eq.software_identifier },
  { header: "Marca", value: (eq) => eq.brand_name },
  { header: "Modelo", value: (eq) => eq.equipment_model_name },
  { header: "Sede", value: (eq) => eq.branch_name },
  { header: "Ubicación", value: (eq) => eq.location },
  { header: "Área", value: (eq) => eq.area },
  { header: "Departamento", value: (eq) => eq.department },
  { header: "Ciudad", value: (eq) => eq.city },
  { header: "Tipo de tecnología", value: (eq) => eq.technology_type },
  { header: "Clasificación biomédica", value: (eq) => eq.biomedical_classification },
  { header: "Clase de riesgo", value: (eq) => eq.risk_class_display ?? eq.risk_class },
  { header: "Fabricante", value: (eq) => eq.manufacturer },
  { header: "Proveedor", value: (eq) => eq.owner },
  { header: "Proveedor de adquisición", value: (eq) => eq.supplier_acquisition },
  { header: "Cliente", value: (eq) => eq.client_name },
  { header: "Fecha de compra", value: (eq) => eq.purchase_date },
  { header: "Costo", value: (eq) => eq.equipment_cost },
  { header: "Fecha de fabricación", value: (eq) => eq.manufacture_date },
  { header: "Inicio de funcionamiento", value: (eq) => eq.start_use_date },
  { header: "Garantía desde", value: (eq) => eq.warranty_start_date },
  { header: "Garantía hasta", value: (eq) => eq.warranty_end_date },
  { header: "Proveedor de mantenimiento", value: (eq) => eq.maintenance_provider },
  { header: "Frecuencia de mantenimiento (meses)", value: (eq) => eq.maintenance_frequency_months },
  { header: "Último preventivo", value: (eq) => eq.last_preventive },
  { header: "Próximo preventivo", value: (eq) => eq.next_preventive },
  { header: "Código de calibración", value: (eq) => eq.calibration_date },
  { header: "Frecuencia de calibración (meses)", value: (eq) => eq.calibration_frequency_months },
  { header: "Última calibración", value: (eq) => eq.last_calibration },
  { header: "Próxima calibración", value: (eq) => eq.next_calibration },
  { header: "Clase de seguridad eléctrica", value: (eq) => eq.electrical_safety_class },
  { header: "Tipo de seguridad eléctrica", value: (eq) => eq.electrical_safety_type },
  { header: "Registro INVIMA", value: (eq) => eq.invima_registration },
  { header: "ECRI", value: (eq) => eq.ecri },
  { header: "Vida útil (años)", value: (eq) => eq.life_use_years },
  { header: "Estado", value: (eq) => eq.status_display ?? eq.status },
  { header: "Observaciones", value: (eq) => eq.observations },
];

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function columnName(index: number): string {
  let name = "";
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

function sheetXml(rows: Equipment[]): string {
  const header = COLUMNS.map(
    (col, i) =>
      `<c r="${columnName(i)}1" t="inlineStr"><is><t>${xmlEscape(col.header)}</t></is></c>`,
  ).join("");
  const body = rows
    .map((eq, rowIndex) => {
      const cells = COLUMNS.map((col, colIndex) => {
        const raw = col.value(eq);
        const text = raw == null ? "" : String(raw);
        return `<c r="${columnName(colIndex)}${rowIndex + 2}" t="inlineStr"><is><t>${xmlEscape(text)}</t></is></c>`;
      }).join("");
      return `<row r="${rowIndex + 2}">${cells}</row>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">${header}</row>
    ${body}
  </sheetData>
</worksheet>`;
}

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function zipStore(files: { path: string; text: string }[]): Blob {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.path);
    const data = encoder.encode(file.text);
    const crc = crc32(data);
    const local = new Uint8Array(30 + name.length);
    const view = new DataView(local.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(8, 0, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, data.length, true);
    view.setUint32(22, data.length, true);
    view.setUint16(26, name.length, true);
    local.set(name, 30);
    locals.push(local, data);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint32(24, data.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint32(42, offset, true);
    central.set(name, 46);
    centrals.push(central);
    offset += local.length + data.length;
  }
  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  const parts = [...locals, ...centrals, end];
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let cursor = 0;
  for (const part of parts) {
    out.set(part, cursor);
    cursor += part.length;
  }
  return new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function downloadEquipmentInventory(rows: Equipment[]) {
  const book = zipStore([
    {
      path: "[Content_Types].xml",
      text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`,
    },
    {
      path: "_rels/.rels",
      text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      path: "xl/workbook.xml",
      text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Inventario equipos" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
    },
    {
      path: "xl/_rels/workbook.xml.rels",
      text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`,
    },
    { path: "xl/worksheets/sheet1.xml", text: sheetXml(rows) },
  ]);
  const url = URL.createObjectURL(book);
  const link = document.createElement("a");
  link.href = url;
  link.download =
    rows.length === 1
      ? `inventario-${rows[0].asset_tag.replace(/[^\w-]+/g, "_")}.xlsx`
      : "inventario-equipos.xlsx";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
