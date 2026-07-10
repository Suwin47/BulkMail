import { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

function App() {
    const [activeTab, setActiveTab] = useState('send');
    const [file, setFile] = useState(null);
    const [fileEmails, setFileEmails] = useState([]);
    const [manualEmails, setManualEmails] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState(false);
    const [notice, setNotice] = useState('');
    const [history, setHistory] = useState([]);
    


    function getManualEmails() {
        return manualEmails
            .split(/[\n, ]+/)
            .map((email) => email.trim())
            .filter((email) => email.includes('@'));
    }

    function getAllEmails() {
        return [...new Set([...getManualEmails(), ...fileEmails])];
    }

    function loadHistory() {
        axios.get('http://localhost:5000/history')
            .then((response) => setHistory(response.data))
            .catch(() => setHistory([]));
    }

    useEffect(() => {
        loadHistory();
    }, []);

    function handleFileChange(e) {
        const selectedFile = e.target.files[0];
        setFile(selectedFile);

        if (!selectedFile) {
            setFileEmails([]);
            return;
        }

        const reader = new FileReader();

        reader.onload = (event) => {
            const data = event.target.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 'A' });

            const emails = rows
                .map((item) => item['A'])
                .filter((email) => typeof email === 'string' && email.includes('@'));

            setFileEmails(emails);
        };

        reader.readAsBinaryString(selectedFile);
    }

    function sendEmail() {
        const emailList = getAllEmails();

        if (emailList.length === 0) {
            setNotice('Please enter at least one recipient email.');
            return;
        }

        setStatus(true);
        setNotice('Sending email...');

        axios.post('http://localhost:5000/sendemail', {
            subject: subject,
            message: message,
            emailList: emailList,
        })
            .then((response) => {
                if (response.data.success) {
                    setNotice('Email sent successfully.');
                    setSubject('');
                    setMessage('');
                    setManualEmails('');
                    setFileEmails([]);
                    setFile(null);
                    loadHistory();
                } else {
                    setNotice(response.data.message || 'Failed to send email.');
                }
            })
            .catch(() => {
                setNotice('Failed to send email.');
            })
            .finally(() => {
                setStatus(false);
            });
    }

    const totalEmails = getAllEmails().length;

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-5">
            <div className="w-full max-w-3xl bg-white shadow-lg rounded-2xl p-8">
                <h1 className="text-4xl font-bold text-center text-blue-600 mb-2">Bulk Mail Sender</h1>
                <p className="text-center text-gray-500 mb-5">Send emails to multiple recipients at once</p>

                <div className="mb-6 flex justify-center">
                    <div className="inline-flex rounded-lg border border-gray-300 bg-gray-50 p-1">
                        <button onClick={() => setActiveTab('send')} className={`px-5 py-2 rounded-md font-semibold ${activeTab === 'send' ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>
                            Send Mail
                        </button>
                        <button onClick={() => { setActiveTab('history'); loadHistory(); }}
                                className={`px-5 py-2 rounded-md font-semibold ${activeTab === 'history' ? 'bg-blue-600 text-white' : 'text-gray-700'}`} >
                            History
                        </button>
                    </div>
                </div>

                {activeTab === 'send' && (
                    <div className="space-y-5">
                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Subject</label>
                            <input type="text" onChange={(e) => setSubject(e.target.value)} value={subject} placeholder="Enter email subject"
                                className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Email Body</label>
                            <textarea onChange={(e) => setMessage(e.target.value)} value={message} rows="7" placeholder="Write your email content..."
                                className="w-full border border-gray-300 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Recipient Emails</label>
                            <textarea onChange={(e) => setManualEmails(e.target.value)} value={manualEmails} rows="3" placeholder="Enter Valid Emails"
                                className="w-full border border-gray-300 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Upload Recipients File</label>
                            <label htmlFor="fileInput" className="flex items-center justify-center gap-4 w-full h-28 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer">
                                <div className="text-center">
                                    <p className="text-gray-700 font-medium">{file ? file.name : 'Choose a file'}</p>
                                    <p className="text-sm text-gray-500">Excel first column should contain emails</p>
                                </div>
                            </label>

                            <input type="file" onChange={handleFileChange} id="fileInput" className="hidden" />
                            <p className="text-center mt-4 font-semibold text-blue-600">Total Recipients: {totalEmails}</p>
                        </div>

                        {notice && ( <p className="text-center font-semibold text-blue-600">{notice}</p> )}

                        <button onClick={sendEmail} disabled={status}
                            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-900 transition duration-300 disabled:bg-gray-400" >
                            {status ? 'Sending...' : 'Send Email'}
                        </button>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div>
                        <h2 className="text-2xl font-bold text-center text-gray-800 mb-5">Email History</h2>

                        {history.length === 0 ? (
                            <p className="text-center text-gray-500">No email history found.</p>
                        ) : (
                            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                                {history.map((item) => (
                                    <div key={item._id} className="border border-gray-200 rounded-lg p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="font-semibold text-gray-800">{item.subject || 'No subject'}</p>
                                                <p className="text-sm text-gray-500">{new Date(item.sentAt).toLocaleString()}</p>
                                            </div>
                                            <span className={`rounded px-2 py-1 text-xs font-bold ${item.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {item.status}
                                            </span>
                                        </div>
                                        <p className="mt-2 text-sm text-gray-600">Recipients: {item.recipients?.length || 0}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;
