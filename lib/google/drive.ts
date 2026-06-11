import { google } from "googleapis";
import { DRIVE_SERVICE_FOLDERS } from "@/lib/constants/jobs";
import { generateGallerySlug, generateSocialCaption } from "@/lib/utils/format";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export function isGoogleDriveConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN &&
      process.env.GOOGLE_DRIVE_UPLOADS_FOLDER_ID,
  );
}

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Google Drive is not configured");
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

function detectServiceType(folderName: string) {
  for (const [service, driveFolder] of Object.entries(DRIVE_SERVICE_FOLDERS)) {
    if (folderName.includes(driveFolder)) return service;
  }
  return "Other";
}

function countMediaFiles(files: { mimeType?: string | null; name?: string | null }[]) {
  let photos = 0;
  let videos = 0;
  for (const file of files) {
    const mime = file.mimeType || "";
    if (mime.startsWith("image/")) photos += 1;
    if (mime.startsWith("video/")) videos += 1;
  }
  return { photos, videos };
}

export async function syncDriveContentUploads() {
  if (!isGoogleDriveConfigured()) return [];

  const auth = getOAuthClient();
  const drive = google.drive({ version: "v3", auth });
  const rootFolderId = process.env.GOOGLE_DRIVE_UPLOADS_FOLDER_ID!;
  const supabase = getSupabaseAdmin();

  const { data: serviceFolders } = await drive.files.list({
    q: `'${rootFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id,name)",
    pageSize: 100,
  });

  const uploads = [];

  for (const serviceFolder of serviceFolders.files || []) {
    const serviceType = detectServiceType(serviceFolder.name || "");

    const { data: jobFolders } = await drive.files.list({
      q: `'${serviceFolder.id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id,name,createdTime,webViewLink)",
      orderBy: "createdTime desc",
      pageSize: 50,
    });

    for (const folder of jobFolders.files || []) {
      const { data: mediaFiles } = await drive.files.list({
        q: `'${folder.id}' in parents and trashed=false`,
        fields: "files(id,name,mimeType,webViewLink,webContentLink,createdTime)",
        pageSize: 200,
      });

      const files = mediaFiles.files || [];
      const { photos, videos } = countMediaFiles(files);
      const uploadDate = folder.createdTime?.slice(0, 10) || null;
      const vehicleName = folder.name || "Unknown Vehicle";
      const driveFolderUrl = folder.webViewLink || `https://drive.google.com/drive/folders/${folder.id}`;

      const record = {
        drive_folder_id: folder.id,
        drive_folder_url: driveFolderUrl,
        vehicle_name: vehicleName,
        service_type: serviceType,
        photos_count: photos,
        videos_count: videos,
        upload_date: uploadDate,
        caption_reel: generateSocialCaption(vehicleName, serviceType, "reel"),
        caption_facebook: generateSocialCaption(vehicleName, serviceType, "facebook"),
        synced_at: new Date().toISOString(),
      };

      if (supabase) {
        await supabase.from("content_uploads").upsert(record, {
          onConflict: "drive_folder_id",
        });

        const slug = generateGallerySlug(vehicleName, serviceType, uploadDate || undefined);
        const photoUrls = files
          .filter((f) => (f.mimeType || "").startsWith("image/"))
          .map((f) => f.webViewLink || f.webContentLink)
          .filter(Boolean) as string[];
        const videoUrls = files
          .filter((f) => (f.mimeType || "").startsWith("video/"))
          .map((f) => f.webViewLink || f.webContentLink)
          .filter(Boolean) as string[];

        await supabase.from("gallery_items").upsert(
          {
            slug,
            vehicle: vehicleName,
            service_type: serviceType,
            work_date: uploadDate,
            photos: photoUrls,
            videos: videoUrls,
            seo_title: `${vehicleName} ${serviceType} in Altoona, PA | AutoDV8ions`,
            seo_description: `See ${vehicleName} ${serviceType.toLowerCase()} work by AutoDV8ions in Altoona, PA. Recent custom automotive work from our shop.`,
            published: true,
          },
          { onConflict: "slug" },
        );
      }

      uploads.push(record);
    }
  }

  return uploads;
}

export async function listContentUploadsFromDb() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data } = await supabase
    .from("content_uploads")
    .select("*")
    .order("upload_date", { ascending: false })
    .limit(100);

  return data || [];
}
