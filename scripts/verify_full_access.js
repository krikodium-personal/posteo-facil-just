import { Dropbox } from 'dropbox';
import fetch from 'node-fetch'; // Need node-fetch for script environment if not available

// User provided credentials
const APP_KEY = 'aw5ua1tm06zi44r';
const APP_SECRET = 'muf569i3a61pp94';
const TEMP_TOKEN = 'sl.u.AGTqxuK0HYDO6fIVauKZ6SkYykNEBCoajHuQcGExXHkMptICClueF18K-RV9nUbkypyW_I_nLscA5twn9a30eMy2iSqmaT4RFaghOKqeWL8cYQQkSnY1Bzom3n8LhXkWJL7Vu2lV3rPmLrP_drr4sD3lAOZEVC-ZtOW2wT7CrDrKCt0SUed2mUkNJOxN_Ztiqso71_P1KcyIR2MkHt3mWBJa41JRi9xyXE_fW4z2D1GmSP_gO_ZnQU10tgGVx-r0wqawLXTqLYCzLWATjzTE02YvK2ljWZeFyPiMltukq9xKWDTgmsVPQTv8M7rdpp8Ukkt1D-U0giDD6zCD0GXdcio97oPMU1S8NzOyPZuqBOf9tcRqAlx2QmQfxD9VpxZ9AJpnoHeXiA7-6edb0A5Sg1epCW5E6_d0ykkqcYH-mFDDK_DVtB2Hf076joqfh8MEjKHJOxTa0Rmldue1zQoaEI6ycZPrWTGnnon3EWbq3StCTDiFu8yVj-RrOq3JaW-0NgDBSmH-uHZNVZb8gZGGVKusjqhGr5X1N8CU0oHJJn1j8tm71opitSCQmC3ojmBfiO8ukID13l3mgSJcKIEuXHFS372NcRcBn_AbdSgmFOSMvAEc-pyAMJBKzODTAmnKQ8H1YSNyYW_HsRBkkXlJwiCzoIMUyLgyVP-SF8SMw7sPtH_bFSMpckxfpwsoeyxoLUfG6aCOWFlgq-HPWPrDRZgSmrgGJ0itvsnNgVWqCO3ikvkLEGjhcRcxZPYYlzpEeZ9hXbQsGnedPizfcQ80uBe8pqAQqPGVvETw_a_4jXfcCb3euX3XgtlHG1q8RjTobdnTsa7mGIcc1fq_KwwUFzkBfc591EFvsOjJkaeogOOu_gw4FCmwxuAca6wgF5lyeR_FWuW5IeDv5DO3hiLnICqTK3JPm4Nw2XlYTHI-ydmP1YHtRI285kagz_msF5ZXoWnGCVnh1Q41NqFFZwtfgFeDdO3CckqAg1WeSHnnziIouuJmUNcoC3VnT4cPSFSuXVje3f2aSqlmt5nBas_v64rfkq5Uq4G_bJuP6gd-JawaSay6Mx5MImrCPEAQ4xuVcshZGe6hsDn4JbUwzckBuZWQZGsQz6K69M5DvdQoF6OsQAkt5QN8uYPkIGKeQQzSMKCzkXfFaWkRwhZyx1RkMPXzNMlM4qBMLl3igSgo5VcMfePfi4lePIrFUNUTUGXspSEJFdmzieJzf5gX_hrFCz5UvspoTQeac5br4-vJ1YpDTZ-AXxuPITVWQ3LYz2zbd8zGgb4CufbY3MUsgEF9yQkDX2RxDonHdXEtMuDCGMM-Iw';

const dbx = new Dropbox({
    accessToken: TEMP_TOKEN,
    clientId: APP_KEY,
    clientSecret: APP_SECRET
});

const verify = async () => {
    try {
        console.log("1. Listing Root Folder to find path...");
        // List entries in root
        const list = await dbx.filesListFolder({ path: '', limit: 10 });
        const entries = list.result.entries;
        console.log(`Found ${entries.length} items in root.`);
        entries.forEach(e => console.log(` - ${e['.tag']}: ${e.path_display}`));

        // Find a file to test tags on (looking for image/video)
        // Since we are now full dropbox, we probably need to find where the user's data is.
        // I'll search recursively for a bit or just grab the first file found.

        let targetFile = null;
        // Helper to find a file deep
        for (const entry of entries) {
            if (entry['.tag'] === 'file') {
                targetFile = entry;
                break;
            } else if (entry['.tag'] === 'folder') {
                // Peek inside 1 level
                try {
                    const sub = await dbx.filesListFolder({ path: entry.path_lower, limit: 1 });
                    if (sub.result.entries.length > 0 && sub.result.entries[0]['.tag'] === 'file') {
                        targetFile = sub.result.entries[0];
                        break;
                    }
                } catch (e) { }
            }
        }

        if (!targetFile) {
            console.log("No file found to test tags.");
            return;
        }

        console.log(`\n2. Testing Native Tags on: ${targetFile.path_display} (${targetFile.id})`);

        const response = await fetch('https://api.dropboxapi.com/2/files/tags/get', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TEMP_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                paths: [targetFile.path_lower]
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log("SUCCESS! Tags Response:", JSON.stringify(data, null, 2));
        } else {
            console.log("FAILED to get tags:", response.status, await response.text());
        }

    } catch (e) {
        console.error("Verification Error:", e);
    }
};

verify();
