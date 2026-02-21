import { s as supabase } from './index-B4F2XZYo.js';

const bunnyService = {
  uploadFile: async (file, orgName) => {
    console.log(`Uploading ${file.name} for organization ${orgName}...`);
    const { data, error } = await supabase.functions.invoke("bunny-upload", {
      headers: {
        // Encode names to handle special characters
        "X-File-Name": encodeURIComponent(file.name),
        "X-Org-Name": encodeURIComponent(orgName)
      },
      body: file
    });
    if (error) {
      console.error("Bunny upload edge function error:", error);
      throw error;
    }
    if (!data.cdnUrl) {
      throw new Error("The Edge Function did not return a cdnUrl. Check the function logs.");
    }
    console.log(`Upload complete. URL: ${data.cdnUrl}`);
    return data.cdnUrl;
  }
};

export { bunnyService as b };
