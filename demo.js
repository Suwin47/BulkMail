const fileInput = document.getElementById('fileInput');

fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];

    const reader = new FileReader();

    reader.onload = (e) => {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const email = XLSX.utils.sheet_to_json(worksheet, { header: 'A' }); 
        // Assuming the email is in the first cell of the first row
        console.log(email);
    }
    reader.readAsBinaryString(file);
});