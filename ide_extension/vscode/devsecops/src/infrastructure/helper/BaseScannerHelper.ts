import { OutputChannel } from "vscode";
import { StringUtils } from "./StringUtils";
import { MetricsService } from "../services/MetricsService";
import { DockerService } from "../services/DockerService";
import { ErrorHandlingService } from "../services/ErrorHandlingService";
import { ScanConfigurationService } from "../config/ScanConfigurationService";
import { ScannerRes } from "../../domain/model/ScannerRes";

/**
 * BaseScannerHelper - Common functionality for all scanners
 * Consolidates initialization, cleanup, timeout handling, and debug output
 */
export class BaseScannerHelper {
    
    /**
     * Initializes scanner state (clears logs and resets error handlers)
     */
    public static initializeScan(
        outputChannel: OutputChannel,
        metricsHelper: MetricsService,
        dockerErrorHandler: DockerService,
        networkErrorHandler: ErrorHandlingService
    ): number {
        outputChannel.show();
        metricsHelper.clearLogs();
        dockerErrorHandler.reset();
        networkErrorHandler.reset();
        return Date.now();
    }

    /**
     * Creates a timeout handler for scan operations
     * Returns: [timeoutId, cleanupFunction]
     */
    public static createScanTimeout(
        outputChannel: OutputChannel,
        metricsHelper: MetricsService,
        elementToScan: string,
        scanType: "engine_iac" | "engine_container" | "engine_dependencies" | "engine_license",
        onTimeout: () => void,
        startTime: number = 0,
        additionalCleanup?: () => void
    ): NodeJS.Timeout {
        const scanTimeout = ScanConfigurationService.getScanTimeout();
        const timeoutMinutes = Math.floor(scanTimeout / 60000);
        
        return setTimeout(() => {
            outputChannel.appendLine(`Scan timed out after ${timeoutMinutes} minutes`);
            outputChannel.appendLine("Container command may be hanging. Check container engine configuration.");
            metricsHelper.captureLog(outputChannel, `Scan timed out after ${timeoutMinutes} minutes`);
            
            // Run additional cleanup if provided (e.g., remove temp files)
            if (additionalCleanup) {
                additionalCleanup();
            }
            
            const durationMs = startTime ? Date.now() - startTime : 0;
            // Collect failed metrics
            void metricsHelper.collectFailedScanMetrics(elementToScan, scanType, 'local-docker', durationMs)
                .then(() => {
                    onTimeout();
                })
                .catch((error) => {
                    metricsHelper.captureError(outputChannel, error, "collecting timeout metrics");
                    onTimeout();
                });
        }, scanTimeout);
    }

    /**
     * Handles debug mode output (stderr and cleaned stdout)
     */
    public static handleDebugOutput(
        outputChannel: OutputChannel,
        debugMode: boolean,
        stderr: string | undefined,
        normalOutput: string
    ): void {
        // Show stderr in debug mode
        if (debugMode && stderr) {
            outputChannel.appendLine("\n📋 STDERR OUTPUT:");
            outputChannel.appendLine(stderr);
        }

        // Show cleaned stdout in debug mode
        if (debugMode) {
            const cleanedOutput = StringUtils.removeAnsiEscapeCodes(normalOutput);
            outputChannel.appendLine("\n📄 SCAN OUTPUT:");
            outputChannel.appendLine(cleanedOutput);
        }
    }

    /**
     * Handles scan completion - metrics collection and result resolution
     */
    public static async completeScan(
        elementToScan: string,
        findings: any[],
        severityCounts: any,
        scanResult: boolean,
        scanType: "engine_iac" | "engine_container" | "engine_dependencies" | "engine_license",
        metricsHelper: MetricsService,
        outputChannel: OutputChannel,
        resolve: (value: ScannerRes) => void,
        startTime: number = 0
    ): Promise<void> {
        metricsHelper.captureLog(outputChannel, `Found ${findings.length} issues in scan`);
        const durationMs = startTime ? Date.now() - startTime : 0;
        
        void metricsHelper.collectAndstoreMetricsData(
            elementToScan,
            findings,
            severityCounts,
            scanResult,
            scanType,
            'local-docker',
            durationMs
        ).catch((error) => {
            metricsHelper.captureError(outputChannel, error, "storing metrics");
        });

        resolve(new ScannerRes(scanResult, findings, severityCounts));
    }

    /**
     * Handles scan failure - error logging and metrics collection
     */
    public static async handleScanFailure(
        elementToScan: string,
        error: unknown,
        context: string,
        scanType: "engine_iac" | "engine_container" | "engine_dependencies" | "engine_license",
        metricsHelper: MetricsService,
        outputChannel: OutputChannel,
        resolve: (value: ScannerRes) => void,
        additionalCleanup?: () => void,
        startTime: number = 0
    ): Promise<void> {
        metricsHelper.captureError(outputChannel, error, context);
        
        if (additionalCleanup) {
            additionalCleanup();
        }
        
        const durationMs = startTime ? Date.now() - startTime : 0;
        await metricsHelper.collectFailedScanMetrics(elementToScan, scanType, 'local-docker', durationMs);
        resolve(new ScannerRes(false, [], null));
    }
}
