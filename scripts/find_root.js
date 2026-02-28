import { Dropbox } from 'dropbox';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const TEMP_TOKEN = 'sl.u.AGTqxuK0HYDO6fIVauKZ6SkYykNEBCoajHuQcGExXHkMptICClueF18K-RV9nUbkypyW_I_nLscA5twn9a30eMy2iSqmaT4RFaghOKqeWL8cYQQkSnY1Bzom3n8LhXkWJL7Vu2lV3rPmLrP_drr4sD3lAOZEVC-ZtOW2wT7CrDrKCt0SUed2mUkNJOxN_Ztiqso71_P1KcyIR2MkHt3mWBJa41JRi9xyXE_fW4z2D1GmSP_gO_ZnQU10tgGVx-r0wqawLXTqLYCzLWATjzTE02YvK2ljWZeFyPiMltukq9xKWDTgmsVPQTv8M7rdpp8Ukkt1D-U0giDD6zCD0GXdcio97oPMU1S8NzOyPZuqBOf9tcRqAlx2QmQfxD9VpxZ9AJpnoHeXiA7-6edb0A5Sg1epCW5E6_d0ykkqcYH-mFDDK_DVtB2Hf076joqfh8MEjKHJOxTa0Rmldue1zQoaEI6ycZPrWTGnnon3EWbq3StCTDiFu8yVj-RrOq3JaW-0NgDBSmH-uHZNVZb8gZGGVKusjqhGr5X1N8CU0oHJJn1j8tm71opitSCQmC3ojmBfiO8ukID13l3mgSJcKIEuXHFS372NcRcBn_AbdSgmFOSMvAEc-pyAMJBKzODTAmnKQ8H1YSNyYW_HsRBkkXlJwiCzoIMUyLgyVP-SF8SMw7sPtH_bFSMpckxfpwsoeyxoLUfG6aCOWFlgq-HPWPrDRZgSmrgGJ0itvsnNgVWqCO3ikvkLEGjhcRcxZPYYlzpEeZ9hXbQsGnedPizfcQ80uBe8pqAQqPGVvETw_a_4jXfcCb3euX3XgtlHG1q8RjTobdnTsa7mGIcc1fq_KwwUFzkBfc591EFvsOjJkaeogOOu_gw4FCmwxuAca6wgF5lyeR_FWuW5IeDv5DO3hiLnICqTK3JPm4Nw2XlYTHI-ydmP1YHtRI285kagz_msF5ZXoWnGCVnh1Q41NqFFZwtfgFeDdO3CckqAg1WeSHnnziIouuJmUNcoC3VnT4cPSFSuXVje3f2aSqlmt5nBas_v64rfkq5Uq4G_bJuP6gd-JawaSay6Mx5MImrCPEAQ4xuVcshZGe6hsDn4JbUwzckBuZWQZGsQz6K69M5DvdQoF6OsQAkt5QN8uYPkIGKeQQzSMKCzkXfFaWkRwhZyx1RkMPXzNMlM4qBMLl3igSgo5VcMfePfi4lePIrFUNUTUGXspSEJFdmzieJzf5gX_hrFCz5UvspoTQeac5br4-vJ1YpDTZ-AXxuPITVWQ3LYz2zbd8zGgb4CufbY3MUsgEF9yQkDX2RxDonHdXEtMuDCGMM-Iw';

const dbx = new Dropbox({
    accessToken: TEMP_TOKEN,
    clientId: envConfig.VITE_DROPBOX_APP_KEY,
    clientSecret: envConfig.VITE_DROPBOX_APP_SECRET
});

const searchRoot = async () => {
    try {
        console.log("Searching for 'Carruseles' folder...");
        const response = await dbx.filesSearchV2({
            query: "Carruseles",
            options: {
                max_results: 10,
                file_categories: [{ '.tag': 'folder' }]
            }
        });

        const matches = response.result.matches;
        if (matches.length > 0) {
            console.log("Found folders:");
            matches.forEach(m => {
                const meta = m.metadata.metadata;
                console.log(`PATH: ${meta.path_display}`);
            });
        } else {
            console.log("No 'Carruseles' folder found via search. Listing root...");
            const list = await dbx.filesListFolder({ path: '', recursive: false });
            list.result.entries.forEach(e => console.log(` - ${e.path_display}`));
        }
    } catch (e) {
        console.error("Error:", e);
    }
};

searchRoot();
