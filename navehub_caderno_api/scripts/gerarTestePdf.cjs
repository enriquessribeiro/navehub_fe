const fs = require("fs");
const path = require("path");

const linhas = [
  "Questao 1",
  "Qual a probabilidade de tirar um numero par em um dado comum?",
  "A) 1/6",
  "B) 1/2",
  "C) 1/3",
  "D) 2/3",
  "E) 5/6",
  "Gabarito: B",
  "",
  "Questao 2",
  "Um triangulo tem lados 3, 4 e 5. Qual a area?",
  "A) 6",
  "B) 10",
  "C) 12",
  "D) 15",
  "E) 25",
  "Gabarito: A",
];

let conteudo = "BT /F1 12 Tf 50 760 Td 16 TL\n";
for (const linha of linhas) {
  const escapada = linha.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  conteudo += `(${escapada}) Tj T*\n`;
}
conteudo += "ET\nq 120 0 0 80 50 80 cm /Im1 Do Q\n";

const imagem = Buffer.from([
  255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 0,
]);

const objetos = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> /XObject << /Im1 6 0 R >> >> /Contents 5 0 R >>",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  `<< /Length ${Buffer.byteLength(conteudo, "latin1")} >>\nstream\n${conteudo}endstream`,
  `<< /Type /XObject /Subtype /Image /Width 2 /Height 2 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length ${imagem.length} >>\nstream\n${imagem.toString("latin1")}endstream`,
];

let pdf = "%PDF-1.4\n";
const offsets = [];
objetos.forEach((corpo, indice) => {
  offsets.push(Buffer.byteLength(pdf, "latin1"));
  pdf += `${indice + 1} 0 obj\n${corpo}\nendobj\n`;
});

const inicioXref = Buffer.byteLength(pdf, "latin1");
pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
for (const offset of offsets) {
  pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
}
pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`;

const destino = path.join(__dirname, "..", "data", "uploads", "teste.pdf");
fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.writeFileSync(destino, Buffer.from(pdf, "latin1"));
console.log("PDF de teste gerado em", destino);