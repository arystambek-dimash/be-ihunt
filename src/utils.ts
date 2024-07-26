import {WebPDFLoader} from "@langchain/community/document_loaders/web/pdf";

async function loadPDF(url: string, token?: string) {
    if (!token) {
        const response = await fetch(url);
        const data = await response.blob();
        const loader = new WebPDFLoader(data);
        const pdfData = await loader.load();
        return pdfData.map(page => JSON.stringify(page)).join(' ');
    }
    const response = await fetch(url, {headers: {authorization: `Bearer ${token}`}});
    const data = await response.blob();
    const loader = new WebPDFLoader(data);

    const pdfData = await loader.load();
    return pdfData.map(page => JSON.stringify(page)).join(' ');
}

export default loadPDF