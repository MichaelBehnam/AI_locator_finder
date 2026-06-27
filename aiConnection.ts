import {LMStudioClient} from "@lmstudio/sdk";

/**
 * Singleton owner of the single LM Studio connection for the whole test run.
 *
 * The {@link LMStudioClient} (and its underlying WebSocket) is created lazily on
 * first {@link AIConnection.getInstance} call and then reused by every
 * {@link AIHelper}, so the project connects to LM Studio **once** and
 * disconnects **once** — via {@link AIConnection.disconnect} — at the very end.
 *
 * Configuration is read from the environment a single time when the connection
 * is first created.
 */
export class AIConnection {
    private static instance?: AIConnection;

    readonly client: LMStudioClient;
    readonly ip: string;
    readonly port: string;
    readonly modelName: string;
    readonly maxAttempts: number;

    private constructor() {
        this.ip = process.env.AI_IP ?? "127.0.0.1";
        this.port = process.env.AI_PORT ?? "1234";
        this.modelName = process.env.MODEL_NAME ?? "google/gemma-4-e4b";
        this.maxAttempts = Number(process.env.MAX_ATTEMPTS) || 5;
        this.client = new LMStudioClient({baseUrl: `ws://${this.ip}:${this.port}`});
    }

    /** The shared connection, created on first call and reused afterwards. */
    static getInstance(): AIConnection {
        if (AIConnection.instance === undefined) {
            AIConnection.instance = new AIConnection();
        }
        return AIConnection.instance;
    }

    /**
     * Close the single LM Studio connection and forget the instance, so a later
     * {@link AIConnection.getInstance} would establish a fresh one. Call this
     * exactly once, at the end of the run.
     */
    static async disconnect(): Promise<void> {
        const current: AIConnection | undefined = AIConnection.instance;
        if (current === undefined) {
            return;
        }
        AIConnection.instance = undefined;

        // LMStudioClient is async-disposable: invoking its Symbol.asyncDispose
        // closes the underlying WebSocket. The well-known symbol is resolved at
        // runtime (it exists on Node >= 20) so this stays correct regardless of
        // the configured TypeScript `lib`.
        const asyncDispose: symbol | undefined = (Symbol as unknown as {asyncDispose?: symbol}).asyncDispose;
        const client: Record<symbol, (() => Promise<void>) | undefined> =
            current.client as unknown as Record<symbol, (() => Promise<void>) | undefined>;
        const dispose: (() => Promise<void>) | undefined = asyncDispose ? client[asyncDispose] : undefined;
        if (dispose) {
            await dispose.call(current.client);
        }
    }
}
