let inpFieldW, inpFieldL, inpLineW, inpLineL, inpSafeW, inpSafeL;
let btnH, btnV, selStyle, selStart, btnInvert;
let inpProjectName; 
let fieldW = 44, fieldL = 64, lineW = 40, lineL = 60, safeW = 2, safeL = 2;
let rollW = 4, rollL = 25;
let layoutMode = 'Vertical';
let colorInverted = false;
let scaleFactor = 15; 
let mainContainer, canvasContainer, tableDiv;

const GRASS_DARK = '#2d5a27';
const GRASS_LIGHT = '#5a8d4a';
const THEME_BLUE = '#2980b9';
const THEME_YELLOW = '#f5b041';

function setup() {
  let cssStyles = createElement('style', `
    #main-wrapper {
      display: flex;
      flex-direction: row;
      gap: 30px;
      align-items: flex-start;
      flex-wrap: wrap;
      margin-top: 20px;
    }
    input {
      padding: 2px 5px;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
  `);

  let controlX = 20;
  
  // 1. ส่วนหัวโครงการ
  createSpan('<b>ชื่อโครงการ:</b>').position(controlX, 5);
  inpProjectName = createInput('โครงการสนามฟุตบอลมาตรฐาน').position(controlX + 85, 5).size(250);
  
  // 2. ส่วนควบคุมขนาดสนาม (ปรับ Offset ใหม่ไม่ให้ทับข้อความ)
  createP('<b>1. ขนาดพื้นที่สนาม และ SafeZone (เมตร)</b>').position(controlX, 25);
  let row1Y = 65;
  
  createSpan('สนาม(ก):').position(controlX, row1Y);
  inpFieldW = createInput('44').position(controlX + 60, row1Y).size(30);
  createSpan('สนาม(ย):').position(controlX + 105, row1Y);
  inpFieldL = createInput('64').position(controlX + 160, row1Y).size(30);
  
  createSpan('เส้นขาว(ก):').position(controlX + 210, row1Y);
  inpLineW = createInput('40').position(controlX + 280, row1Y).size(30);
  createSpan('เส้นขาว(ย):').position(controlX + 325, row1Y);
  inpLineL = createInput('60').position(controlX + 395, row1Y).size(30);
  
  createSpan('Safe(ก):').position(controlX + 445, row1Y);
  inpSafeW = createInput('2').position(controlX + 500, row1Y).size(30);
  createSpan('Safe(ย):').position(controlX + 545, row1Y);
  inpSafeL = createInput('2').position(controlX + 600, row1Y).size(30);

  // 3. ส่วนควบคุมการปูหญ้า
  createP('<b>2. การตั้งค่าการปูหญ้า</b>').position(controlX, 100);
  let row2Y = 140;
  btnH = createButton('ปูแนวนอน').position(controlX, row2Y).mousePressed(() => { layoutMode = 'Horizontal'; update(); });
  btnV = createButton('ปูแนวตั้ง').position(controlX + 85, row2Y).mousePressed(() => { layoutMode = 'Vertical'; update(); });
  
  createSpan('รูปแบบ:').position(controlX + 175, row2Y);
  selStyle = createSelect().position(controlX + 225, row2Y);
  selStyle.option('สีเดียว (Solid)');
  selStyle.option('สลับสี (Striped)');
  selStyle.changed(update);
  
  btnInvert = createButton('🔄สลับเฉด').position(controlX + 345, row2Y).mousePressed(() => { colorInverted = !colorInverted; update(); });
  
  createSpan('เริ่มจาก:').position(controlX + 430, row2Y);
  selStart = createSelect().position(controlX + 485, row2Y);
  selStart.option('จากมุมสนาม 0,0'); 
  selStart.option('กึ่งกลางL/2 แบบที่ 1');
  selStart.option('กึ่งกลางL/2 แบบที่ 2');
  selStart.option('จากมุมเส้นขาว');
  selStart.changed(update);

  // 4. โครงสร้าง Layout
  mainContainer = createDiv('').id('main-wrapper').position(10, 210);
  let leftCol = createDiv('').id('left-col').parent(mainContainer);
  canvasContainer = createDiv('').id('canvas-holder').parent(leftCol);
  let cnv = createCanvas(800, 520); 
  cnv.parent(canvasContainer);
  tableDiv = createDiv('').id('table-holder').parent(mainContainer);

  noLoop();
  update();
}

function update() {
  fieldW = float(inpFieldW.value()) || 0;
  fieldL = float(inpFieldL.value()) || 0;
  lineW = float(inpLineW.value()) || 0;
  lineL = float(inpLineL.value()) || 0;
  safeW = float(inpSafeW.value()) || 0; 
  safeL = float(inpSafeL.value()) || 0; 
  
  scaleFactor = min(600 / fieldL, 400 / fieldW); 
  redraw(); 
}

function draw() {
  clear(); background(245);
  push(); translate(120, 110); 
  let finalData = calculateStaircaseAndDraw();
  drawWhiteLines();
  drawDimensions();
  pop();
  generateFinalTable(finalData);
}

function calculateStaircaseAndDraw() {
  let allPieces = []; 
  let isStriped = selStyle.value().includes('สลับสี');
  let startMode = selStart.value();
  let totalDimForStrips = (layoutMode === 'Vertical') ? fieldL : fieldW;
  let lineStartPos = (layoutMode === 'Vertical') ? safeL : safeW;
  let fieldLength = (layoutMode === 'Vertical') ? fieldW : fieldL;

  let strips = [];
  let startOffset = 0;
  if (startMode === 'จากมุมสนาม 0,0') startOffset = 0;
  else if (startMode === 'จากมุมเส้นขาว') startOffset = lineStartPos % rollW;
  else if (startMode.includes('แบบที่ 1')) startOffset = (totalDimForStrips / 2) % rollW;
  else if (startMode.includes('แบบที่ 2')) startOffset = ((totalDimForStrips / 2) - (rollW / 2)) % rollW;
  
  let pos = startOffset;
  while (pos > 0) pos -= rollW;
  while (pos < totalDimForStrips) {
    let actualPos = max(0, pos);
    let size = min(pos + rollW, totalDimForStrips) - actualPos;
    if (size > 0.01) strips.push({ pos: actualPos, size: size, index: Math.floor((pos + 0.001) / rollW) });
    pos += rollW;
  }
  strips.sort((a, b) => a.pos - b.pos);
  let nextRollID = 1;
  let remnantPool = [];
  strips.forEach(s => {
    s.color = getRowColor(s.index, isStriped);
    let fullCount = floor(fieldLength / rollL);
    if (abs(s.size - 4.0) < 0.01) {
      for (let j = 0; j < fullCount; j++) {
        allPieces.push({ roll: nextRollID++, colID: s.index, color: s.color, length: rollL, width: 4, pos: s.pos, startPos: j * rollL, area: 100, note: "ม้วนใหม่ (เต็ม 100)" });
      }
    }
  });
  strips.forEach(s => {
    let remainingToFill = fieldLength;
    let currentY = 0;
    while (remainingToFill > 0.001) {
      let isOccupied = allPieces.find(p => p.colID === s.index && abs(p.startPos - currentY) < 0.1);
      if (isOccupied) { remainingToFill -= isOccupied.length; currentY += isOccupied.length; continue; }
      let targetLen = min(remainingToFill, rollL);
      let remnant = remnantPool.find(r => r.color === s.color && r.width >= s.size - 0.01 && r.length > 0.5);
      if (remnant) {
        let takeLen = min(targetLen, remnant.length);
        allPieces.push({ roll: remnant.rollID, colID: s.index, color: s.color, length: takeLen, width: s.size, pos: s.pos, startPos: currentY, area: takeLen * s.size, note: "เศษม้วน R" + remnant.rollID });
        remnant.length -= takeLen; currentY += takeLen; remainingToFill -= takeLen;
      } else {
        let assignedRollID = nextRollID++;
        let takeLen = min(targetLen, rollL);
        allPieces.push({ roll: assignedRollID, colID: s.index, color: s.color, length: takeLen, width: s.size, pos: s.pos, startPos: currentY, area: takeLen * s.size, note: (abs(s.size-4.0)<0.1)?"-":"เศษหน้ากว้าง" });
        if (rollL - takeLen > 0.5) remnantPool.push({ rollID: assignedRollID, color: s.color, length: rollL - takeLen, width: 4.0 });
        if (4.0 - s.size > 0.1) remnantPool.push({ rollID: assignedRollID, color: s.color, length: takeLen, width: 4.0 - s.size });
        currentY += takeLen; remainingToFill -= takeLen;
      }
    }
  });
  allPieces.forEach(p => {
    if (layoutMode === 'Vertical') drawPiece(p.pos, p.startPos, p.width, p.length, p.roll, p.color);
    else drawPiece(p.startPos, p.pos, p.length, p.width, p.roll, p.color);
  });
  return allPieces;
}

function generateFinalTable(data) {
  let rollMap = new Map();
  data.forEach(item => {
    if (!rollMap.has(item.roll)) rollMap.set(item.roll, { pieces: [], color: item.color, totalUsed: 0 });
    let r = rollMap.get(item.roll);
    r.pieces.push(item);
    r.totalUsed += item.area;
  });
  let sortedRollIDs = Array.from(rollMap.keys()).sort((a, b) => a - b);
  let sumDarkUsed = 0, sumLightUsed = 0, sumDarkScrap = 0, sumLightScrap = 0;
  sortedRollIDs.forEach(id => {
    let r = rollMap.get(id);
    let s = max(0, 100 - r.totalUsed);
    if (r.color === GRASS_DARK) { sumDarkUsed += r.totalUsed; sumDarkScrap += s; }
    else { sumLightUsed += r.totalUsed; sumLightScrap += s; }
  });
  
  const MAX_ROLLS_PER_TABLE = 20; 
  let tableChunks = [];
  for (let i = 0; i < sortedRollIDs.length; i += MAX_ROLLS_PER_TABLE) {
    tableChunks.push(sortedRollIDs.slice(i, i + MAX_ROLLS_PER_TABLE));
  }
  
  const COL_W_R = "35px"; const COL_W_VAL = "40px"; const COL_W_NOTE = "100px"; const COL_W_SUM = "35px"; const TABLE_WIDTH = "370px";
  const TABLE_STYLE_STR = `border-collapse: collapse; table-layout: fixed; width: ${TABLE_WIDTH}; font-family: sans-serif; font-size: 10px; background: white; border: 1px solid #aaa;`;
  const TH_STYLE_LOCAL = "height: 22px; border: 1px solid #aaa; text-align: center; padding: 2px 6px; background: #2980b9; color: white; font-weight: normal;";
  const TD_STYLE_LOCAL = "height: 16px; border: 1px solid #aaa; text-align: center; padding: 1px 4px; line-height: 1; overflow: hidden;";
  const NOTE_TD_STYLE = `height: 16px; border: 1px solid #aaa; text-align: center; padding: 1px 8px; width: ${COL_W_NOTE}; white-space: nowrap; line-height: 1; overflow: hidden;`; 
  const SPACER_STYLE_STR = "width: 10px; background: white; border: none;";
  const TABLE_GAP_STYLE_STR = "width: 10px;";

  let html = `<div style="font-family: sans-serif; margin-bottom: 8px; font-weight: bold; font-size: 16px;">โครงการ: ${inpProjectName.value()}</div>`;
  html += `<div id="table-flex-container" style="display: flex; flex-direction: row; align-items: flex-start; flex-wrap: wrap; gap: 20px;">`;

  tableChunks.forEach((chunk, chunkIdx) => {
    if (chunkIdx > 0) html += `<div style="${TABLE_GAP_STYLE_STR}"></div>`;
    html += `<table style="${TABLE_STYLE_STR}">
      <colgroup><col style="width:${COL_W_R};"><col style="width:${COL_W_VAL};"><col style="width:${COL_W_VAL};"><col style="width:${COL_W_VAL};"><col style="width:${COL_W_NOTE};"><col style="width:10px;"><col style="width:${COL_W_SUM};"><col style="width:${COL_W_SUM};"><col style="width:${COL_W_SUM};"></colgroup>
      <thead><tr><th style="${TH_STYLE_LOCAL}">ม้วน</th><th style="${TH_STYLE_LOCAL}" colspan="4">Usage</th><th style="${SPACER_STYLE_STR}"></th><th style="${TH_STYLE_LOCAL}; background:${THEME_YELLOW}; color:black;">รวม</th><th style="${TH_STYLE_LOCAL}; background:${THEME_YELLOW}; color:black;">เศษ</th><th style="${TH_STYLE_LOCAL}; background:${THEME_YELLOW}; color:black;">สี</th></tr></thead><tbody>`;
    chunk.forEach(rID => {
      let r = rollMap.get(rID);
      let rollScrap = max(0, 100 - r.totalUsed);
      let col1BG = "#f2f2f2"; 
      r.pieces.forEach((p, idx) => {
        let displayNote = (p.note === "ม้วนใหม่ (เต็ม 100)") ? "-" : p.note;
        html += `<tr>`;
        if (idx === 0) html += `<td style="${TD_STYLE_LOCAL} font-weight:bold; background-color: ${col1BG};" rowspan="${r.pieces.length}">R${rID}</td>`;
        html += `<td style="${TD_STYLE_LOCAL}">${p.length.toFixed(1)}</td><td style="${TD_STYLE_LOCAL}">${p.width.toFixed(1)}</td><td style="${TD_STYLE_LOCAL}">${p.area.toFixed(1)}</td><td style="${NOTE_TD_STYLE}">${displayNote || ""}</td><td style="${SPACER_STYLE_STR}"></td>`;
        if (idx === 0) html += `<td style="${TD_STYLE_LOCAL}" rowspan="${r.pieces.length}">${r.totalUsed.toFixed(1)}</td><td style="${TD_STYLE_LOCAL}" rowspan="${r.pieces.length}">${rollScrap > 0.1 ? rollScrap.toFixed(1) : "-"}</td><td style="${TD_STYLE_LOCAL}" rowspan="${r.pieces.length}">${r.color === GRASS_DARK ? "เข้ม" : "อ่อน"}</td>`;
        html += `</tr>`;
      });
    });
    if (chunkIdx === tableChunks.length - 1) {
      html += `<tr style="font-weight:bold; background:#1b5e20; color:white;"><td colspan="3" style="${TD_STYLE_LOCAL}">รวมสีเขียวเข้ม</td><td style="${TD_STYLE_LOCAL}">${sumDarkUsed.toFixed(1)}</td><td style="${NOTE_TD_STYLE}">ตร.ม.</td><td style="${SPACER_STYLE_STR}"></td><td style="${TD_STYLE_LOCAL} background:#fef5d4; color:black;">เศษเข้ม</td><td style="${TD_STYLE_LOCAL} background:#fef5d4; color:black;">${sumDarkScrap.toFixed(1)}</td><td style="${TD_STYLE_LOCAL} background:#fef5d4; color:black;">ตร.ม.</td></tr>`;
      html += `<tr style="font-weight:bold; background:#4e7d42; color:white;"><td colspan="3" style="${TD_STYLE_LOCAL}">รวมสีเขียวอ่อน</td><td style="${TD_STYLE_LOCAL}">${sumLightUsed.toFixed(1)}</td><td style="${NOTE_TD_STYLE}">ตร.ม.</td><td style="${SPACER_STYLE_STR}"></td><td style="${TD_STYLE_LOCAL} background:#fef5d4; color:black;">เศษอ่อน</td><td style="${TD_STYLE_LOCAL} background:#fef5d4; color:black;">${sumLightScrap.toFixed(1)}</td><td style="${TD_STYLE_LOCAL} background:#fef5d4; color:black;">ตร.ม.</td></tr>`;
      html += `<tr style="font-weight:bold; background:${THEME_BLUE}; color:white;"><td colspan="3" style="${TD_STYLE_LOCAL}">รวมทั้งหมด</td><td style="${TD_STYLE_LOCAL}">${(sumDarkUsed+sumLightUsed).toFixed(1)}</td><td style="${NOTE_TD_STYLE}">ตร.ม.</td><td style="${SPACER_STYLE_STR}"></td><td style="${TD_STYLE_LOCAL} background:${THEME_YELLOW}; color:black;">เศษรวม</td><td style="${TD_STYLE_LOCAL} background:${THEME_YELLOW}; color:black;">${(sumDarkScrap+sumLightScrap).toFixed(1)}</td><td style="${TD_STYLE_LOCAL} background:${THEME_YELLOW}; color:black;">ตร.ม.</td></tr>`;
    }
    html += `</tbody></table>`;
  });
  html += `</div>`; 
  tableDiv.html(html);
}

function drawPiece(x, y, w, l, id, grassColor) {
  fill(grassColor); stroke(255, 40); strokeWeight(1);
  rect(x * scaleFactor, y * scaleFactor, w * scaleFactor, l * scaleFactor);
  fill(255, 255); noStroke(); textAlign(CENTER, CENTER); textSize(10);
  text("R" + id, (x + w/2) * scaleFactor, (y + l/2) * scaleFactor);
}

function getRowColor(i, isStriped) {
  if (!isStriped) return GRASS_DARK;
  return (abs(i) % 2 === 0) ^ colorInverted ? GRASS_DARK : GRASS_LIGHT;
}

function drawWhiteLines() {
  stroke(255, 220); strokeWeight(2); noFill();
  let lx = safeL * scaleFactor; let ly = safeW * scaleFactor;
  rect(lx, ly, lineL * scaleFactor, lineW * scaleFactor);
  line(lx + (lineL/2)*scaleFactor, ly, lx + (lineL/2)*scaleFactor, ly + lineW * scaleFactor);
  ellipse(lx + (lineL/2)*scaleFactor, ly + (lineW/2)*scaleFactor, 6 * 2 * scaleFactor);
}

function drawDimensions() {
  textSize(11); textAlign(CENTER); strokeWeight(1); stroke(100); fill(100);
  
  // --- ขนาดสนามรวม (ระนาบนอกสุดที่ -60) ---
  line(0, -60, fieldL * scaleFactor, -60); 
  text("Field Length: " + fieldL + " m", (fieldL/2)*scaleFactor, -65);
  line(-75, 0, -75, fieldW * scaleFactor);
  push(); translate(-80, (fieldW/2)*scaleFactor); rotate(-HALF_PI); text("Field Width: " + fieldW + " m", 0,0); pop();
  
  let lx = safeL * scaleFactor; let ly = safeW * scaleFactor;
  let ll = lineL * scaleFactor; let lw = lineW * scaleFactor;

  // --- เส้นขาวและ SafeZone (ระนาบเดียวกันที่ -35) ---
  // ด้านยาว
  stroke(0, 120, 255); fill(0, 120, 255);
  line(lx, -35, lx + ll, -35); text("Inner L: " + lineL + " m", lx + ll/2, -40);
  stroke(231, 76, 60); fill(231, 76, 60);
  line(0, -35, lx, -35); text("SL:" + safeL + "m", lx/2, -40);

  // ด้านกว้าง
  stroke(0, 120, 255); fill(0, 120, 255);
  line(-50, ly, -50, ly + lw);
  push(); translate(-55, ly + lw/2); rotate(-HALF_PI); text("Inner W: " + lineW + " m", 0,0); pop();
  stroke(231, 76, 60); fill(231, 76, 60);
  line(-50, 0, -50, ly);
  push(); translate(-55, ly/2); rotate(-HALF_PI); text("SW:" + safeW + "m", 0, 0); pop();
}