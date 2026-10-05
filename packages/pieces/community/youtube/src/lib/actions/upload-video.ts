import { createAction, Property } from '@activepieces/pieces-framework';
import { httpClient, HttpMethod } from '@activepieces/pieces-common';
import { youtubeAuth } from '../common/auth';

const YOUTUBE_UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos';

export const youtubeUploadVideoAction = createAction({
  auth: youtubeAuth,
  name: 'upload_video',
  classification: 'WRITE',
  displayName: 'Upload Video',
  description: 'Upload a video file to YouTube from a URL. Supports Shorts (vertical 9:16 under 60s).',
  props: {
    videoUrl: Property.ShortText({
      displayName: 'Video File URL',
      description: 'Direct URL to the video file (mp4, mov, etc.) to upload.',
      required: true,
    }),
    title: Property.ShortText({
      displayName: 'Title',
      required: true,
    }),
    description: Property.LongText({
      displayName: 'Description',
      required: false,
      defaultValue: '',
    }),
    tags: Property.Array({
      displayName: 'Tags',
      required: false,
    }),
    privacyStatus: Property.StaticDropdown({
      displayName: 'Privacy Status',
      required: true,
      defaultValue: 'private',
      options: {
        options: [
          { label: 'Private', value: 'private' },
          { label: 'Unlisted', value: 'unlisted' },
          { label: 'Public', value: 'public' },
        ],
      },
    }),
    categoryId: Property.StaticDropdown({
      displayName: 'Category',
      required: false,
      defaultValue: '22',
      options: {
        options: [
          { label: 'Film & Animation', value: '1' },
          { label: 'Gaming', value: '20' },
          { label: 'People & Blogs', value: '22' },
          { label: 'Comedy', value: '23' },
          { label: 'Entertainment', value: '24' },
          { label: 'News & Politics', value: '25' },
          { label: 'Howto & Style', value: '26' },
          { label: 'Science & Technology', value: '28' },
        ],
      },
    }),
    madeForKids: Property.Checkbox({
      displayName: 'Made for Kids',
      required: false,
      defaultValue: false,
    }),
  },

  async run(context) {
    const { videoUrl, title, description, tags, privacyStatus, categoryId, madeForKids } =
      context.propsValue;
    const accessToken = context.auth.access_token;

    // Step 1: Download the video file as buffer
    const fileResponse = await fetch(videoUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to download video from URL: ${fileResponse.statusText}`);
    }
    const contentType = fileResponse.headers.get('content-type') ?? 'video/mp4';
    const videoBuffer = await fileResponse.arrayBuffer();
    const videoBytes = new Uint8Array(videoBuffer);

    // Step 2: Initiate resumable upload session
    const metadata = {
      snippet: {
        title,
        description: description ?? '',
        tags: (tags as string[]) ?? [],
        categoryId: categoryId ?? '22',
      },
      status: {
        privacyStatus: privacyStatus ?? 'private',
        selfDeclaredMadeForKids: madeForKids ?? false,
      },
    };

    const initResponse = await fetch(
      `${YOUTUBE_UPLOAD_URL}?uploadType=resumable&part=snippet,status`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': contentType,
          'X-Upload-Content-Length': String(videoBytes.byteLength),
        },
        body: JSON.stringify(metadata),
      },
    );

    if (!initResponse.ok) {
      const err = await initResponse.text();
      throw new Error(`Failed to initiate YouTube upload session: ${err}`);
    }

    const uploadUrl = initResponse.headers.get('location');
    if (!uploadUrl) {
      throw new Error('YouTube did not return an upload URL');
    }

    // Step 3: Upload the video bytes
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(videoBytes.byteLength),
      },
      body: videoBytes,
    });

    if (!uploadResponse.ok) {
      const err = await uploadResponse.text();
      throw new Error(`YouTube upload failed: ${err}`);
    }

    const result = await uploadResponse.json() as {
      id: string;
      snippet?: { title: string; description: string };
      status?: { privacyStatus: string };
    };

    return {
      videoId: result.id,
      videoUrl: `https://www.youtube.com/watch?v=${result.id}`,
      shortsUrl: `https://www.youtube.com/shorts/${result.id}`,
      title: result.snippet?.title,
      privacyStatus: result.status?.privacyStatus,
    };
  },
});
