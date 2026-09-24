import {
  httpClient,
  HttpMethod,
  HttpResponse,
  QueryParams,
} from '@activepieces/pieces-common';
import { AppConnectionValueForAuthProperty } from '@activepieces/pieces-framework';
import { googleGeminiAuth } from '../auth';

export const defaultLLM = 'gemini-3.6-flash';

export const allowedLLMs = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3-flash-preview',
  'gemini-flash-latest',
  'gemini-pro-latest',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-1.5-flash-8b',
];

const isExcludedModel = (model: GeminiModel): boolean => {
  const name = model.name.toLowerCase();
  const displayName = (model.displayName ?? '').toLowerCase();
  const badKeywords = [
    'tts', 'audio', 'banana', 'image', 'video', 'embed', 'imagen', 'veo',
    'robotics', 'antigravity', 'deep-research', 'aqa', 'lyria', 'transcribe', 'live'
  ];
  return badKeywords.some((kw) => name.includes(kw) || displayName.includes(kw));
};

const isAllowedLLM = (model: GeminiModel): boolean => {
  if (isExcludedModel(model)) {
    return false;
  }
  if (
    model.supportedGenerationMethods &&
    !model.supportedGenerationMethods.includes('generateContent')
  ) {
    return false;
  }
  const cleanName = model.name.replace(/^models\//, '');
  if (allowedLLMs.some((allowed) => cleanName === allowed || cleanName === `${allowed}-latest`)) {
    return true;
  }
  // Auto-allow any new Gemini 3+ text models
  return cleanName.startsWith('gemini-3');
};

const isTtsModel = (model: GeminiModel): boolean =>
  model.name.toLowerCase().includes('tts') ||
  (model.displayName?.toLowerCase().includes('tts') ?? false);

const isVeoModel = (model: GeminiModel): boolean =>
  model.name.toLowerCase().includes('veo');

const getCleanModelLabel = (model: GeminiModel): string => {
  const id = model.name.replace(/^models\//, '');
  const cleanId = id.toLowerCase();

  if (cleanId === 'gemini-3.8-flash') return 'Gemini 3.8 Flash (Latest Preview)';
  if (cleanId === 'gemini-3.7-flash') return 'Gemini 3.7 Flash';
  if (cleanId === 'gemini-3.6-flash') return 'Gemini 3.6 Flash (Recommended)';
  if (cleanId === 'gemini-3.5-flash') return 'Gemini 3.5 Flash';
  if (cleanId === 'gemini-3.5-flash-lite') return 'Gemini 3.5 Flash-Lite';
  if (cleanId === 'gemini-3.1-flash-lite') return 'Gemini 3.1 Flash-Lite';
  if (cleanId === 'gemini-flash-latest') return 'Gemini Flash (Latest)';
  if (cleanId === 'gemini-pro-latest') return 'Gemini Pro (Latest)';
  if (cleanId === 'gemini-2.5-flash') return 'Gemini 2.5 Flash';
  if (cleanId === 'gemini-2.5-pro') return 'Gemini 2.5 Pro (Advanced Reasoning)';
  if (cleanId === 'gemini-2.0-flash') return 'Gemini 2.0 Flash';
  if (cleanId === 'gemini-2.0-flash-lite') return 'Gemini 2.0 Flash-Lite';
  if (cleanId === 'gemini-1.5-flash') return 'Gemini 1.5 Flash';
  if (cleanId === 'gemini-1.5-pro') return 'Gemini 1.5 Pro';
  if (cleanId === 'gemini-1.5-flash-8b') return 'Gemini 1.5 Flash-8B';

  return model.displayName ?? id;
};

const testModelCanGenerateText = async ({
  modelName,
  apiKey,
}: {
  modelName: string;
  apiKey: string;
}): Promise<boolean> => {
  const cleanName = modelName.replace(/^models\//, '');
  try {
    const response = await httpClient.sendRequest({
      method: HttpMethod.POST,
      url: `https://generativelanguage.googleapis.com/v1beta/models/${cleanName}:generateContent`,
      queryParams: {
        key: apiKey,
      },
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        contents: [{ parts: [{ text: 'ping' }] }],
        generationConfig: { maxOutputTokens: 1 },
      },
    });
    return response.status >= 200 && response.status < 300;
  } catch {
    return false;
  }
};

const listAllModels = async ({
  auth,
}: {
  auth: GeminiAuth;
}): Promise<GeminiModel[]> => {
  const models: GeminiModel[] = [];
  let pageToken: string | undefined = undefined;

  do {
    const queryParams: QueryParams = {
      key: auth.secret_text,
      pageSize: '1000',
    };
    if (pageToken) {
      queryParams['pageToken'] = pageToken;
    }

    const { body }: HttpResponse<GeminiListModelsResponse> =
      await httpClient.sendRequest<GeminiListModelsResponse>({
        method: HttpMethod.GET,
        url: 'https://generativelanguage.googleapis.com/v1beta/models',
        queryParams,
      });
    models.push(...(body.models ?? []));
    pageToken = body.nextPageToken;
  } while (pageToken);

  return models;
};

const fetchModelOptions = async ({
  auth,
  filter,
}: {
  auth?: GeminiAuth;
  filter: (model: GeminiModel) => boolean;
}) => {
  if (!auth) {
    return {
      disabled: true,
      placeholder: 'Enter your API key first',
      options: [],
    };
  }

  try {
    const models = await listAllModels({ auth });
    const options = models.filter(filter).map((model) => ({
      label: model.displayName ?? model.name.replace('models/', ''),
      value: model.name.replace('models/', ''),
    }));

    return {
      disabled: false,
      options,
    };
  } catch {
    return {
      disabled: true,
      options: [],
      placeholder: "Couldn't load models, check your API key or try again.",
    };
  }
};

export const getGeminiModelOptions = async ({ auth }: { auth?: GeminiAuth }) => {
  if (!auth) {
    return {
      disabled: true,
      placeholder: 'Enter your API key first',
      options: [],
    };
  }

  try {
    const allModels = await listAllModels({ auth });
    const candidates = allModels.filter(isAllowedLLM);

    // Live test each candidate model to weed out rate-limited (429) or broken models
    const testedCandidates = await Promise.all(
      candidates.map(async (model) => {
        const canGenerate = await testModelCanGenerateText({
          modelName: model.name,
          apiKey: auth.secret_text,
        });
        return canGenerate ? model : null;
      })
    );

    const workingModels = testedCandidates.filter((m): m is GeminiModel => m !== null);
    const finalModels = workingModels.length > 0 ? workingModels : candidates;

    // Deduplicate and apply clean display names
    const seenValues = new Set<string>();
    const options = finalModels
      .map((model) => {
        const value = model.name.replace(/^models\//, '');
        return {
          label: getCleanModelLabel(model),
          value,
        };
      })
      .filter((opt) => {
        if (seenValues.has(opt.value)) return false;
        seenValues.add(opt.value);
        return true;
      });

    return {
      disabled: false,
      options,
    };
  } catch {
    return {
      disabled: true,
      options: [],
      placeholder: "Couldn't load models, check your API key or try again.",
    };
  }
};

export const getGeminiTtsModelOptions = async ({ auth }: { auth?: GeminiAuth }) =>
  fetchModelOptions({ auth, filter: isTtsModel });

export const getGeminiVideoModelOptions = async ({
  auth,
}: {
  auth?: GeminiAuth;
}) => fetchModelOptions({ auth, filter: isVeoModel });

type GeminiAuth = AppConnectionValueForAuthProperty<typeof googleGeminiAuth>;

type GeminiModel = {
  name: string;
  displayName?: string;
  supportedGenerationMethods?: string[];
};

type GeminiListModelsResponse = {
  models?: GeminiModel[];
  nextPageToken?: string;
};
