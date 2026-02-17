const exportToCsv = (filename, data) => {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(","),
    // header row
    ...data.map(
      (row) => headers.map((fieldName) => {
        const value = row[fieldName];
        const escaped = ("" + value).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(",")
    )
  ];
  const csvString = csvRows.join("\n");
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
const parseSpreadsheetFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    reader.onload = (event) => {
      try {
        if (!event.target?.result) {
          throw new Error("No se pudo leer el archivo.");
        }
        let headers = [];
        let data = [];
        if (fileExtension === "csv") {
          const text = event.target.result;
          const lines = text.split(/\r\n|\n/).filter((line) => line.trim());
          if (lines.length === 0) throw new Error("Archivo CSV vacío.");
          headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
          data = lines.slice(1).map((line) => line.split(",").map((v) => v.trim().replace(/"/g, "")));
        } else if (fileExtension === "xlsx" || fileExtension === "xls") {
          const workbook = XLSX.read(event.target.result, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: "" });
          if (jsonData.length === 0) throw new Error("La hoja de cálculo está vacía.");
          headers = jsonData[0].map(String);
          data = jsonData.slice(1);
        } else {
          throw new Error("Formato de archivo no soportado. Por favor, usa .csv, .xlsx o .xls");
        }
        resolve({ headers, data });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    if (fileExtension === "csv") {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  });
};

export { exportToCsv as e, parseSpreadsheetFile as p };
