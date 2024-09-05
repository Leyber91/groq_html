let fflateLoaded = false;

function ensureFflateLoaded() {
    return new Promise((resolve) => {
        if (typeof fflate !== 'undefined') {
            fflateLoaded = true;
            resolve();
        } else {
            window.addEventListener('fflate-loaded', () => {
                fflateLoaded = true;
                resolve();
            }, { once: true });
        }
    });
}

export async function compressMessage(message) {
    await ensureFflateLoaded();
    if (!fflateLoaded) {
        console.error('fflate is not loaded');
        return message; // Return uncompressed message as fallback
    }
    return fflate.strToU8(message);
}

export async function decompressMessage(compressedMessage) {
    await ensureFflateLoaded();
    if (!fflateLoaded) {
        console.error('fflate is not loaded');
        return compressedMessage; // Return as-is as fallback
    }
    return fflate.strFromU8(compressedMessage);
}

// Add a function to use compression in the main workflow
export async function handleCompressedCommunication(message, isCompressing = true) {
    if (isCompressing) {
        return await compressMessage(message);
    } else {
        return await decompressMessage(message);
    }
}
