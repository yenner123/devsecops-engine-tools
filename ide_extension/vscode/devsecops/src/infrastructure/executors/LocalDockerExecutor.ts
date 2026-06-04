import { OutputChannel } from "vscode";
import { IScanExecutor, IScanExecutionConfig, IScanExecutionResult } from "./IScanExecutor";
import { IacScanner } from "../scanners/IacScanner";
import { ImageScanner } from "../scanners/ImageScanner";
import { DependenciesScanner } from "../scanners/DependenciesScanner";
import { ScannerRes } from "../../domain/model/ScannerRes";

/**
 * LocalDockerExecutor - Local Docker-based scan execution
 * 
 * This executor uses the existing scanner implementations that run
 * Docker containers locally to perform scans.
 */
export class LocalDockerExecutor implements IScanExecutor {
    private iacScanner: IacScanner;
    private imageScanner: ImageScanner;
    private dependenciesScanner: DependenciesScanner;

    constructor() {
        this.iacScanner = new IacScanner();
        this.imageScanner = new ImageScanner();
        this.dependenciesScanner = new DependenciesScanner();
    }

    getExecutionMode(): 'local-docker' | 'remote-microservice' {
        return 'local-docker';
    }

    async canExecute(): Promise<boolean> {
        // Check if Docker/Podman is available
        // This could be enhanced with actual Docker connectivity check
        return true;
    }

    async execute(
        scanConfig: IScanExecutionConfig,
        outputChannel: OutputChannel,
        logCapture?: (message: string) => void
    ): Promise<IScanExecutionResult> {
        const startTime = Date.now();

        try {
            outputChannel.appendLine(`🐳 Starting local Docker scan...`);
            outputChannel.appendLine(`Target: ${scanConfig.target}`);
            outputChannel.appendLine(`Scan type: ${scanConfig.scanType}`);
            outputChannel.appendLine('');

            let scannerRes: ScannerRes;

            // Execute the appropriate scanner based on scan type
            switch (scanConfig.scanType) {
                case 'iac':
                    scannerRes = await this.executeIacScan(scanConfig, outputChannel);
                    break;

                case 'image':
                    scannerRes = await this.executeImageScan(scanConfig, outputChannel);
                    break;

                case 'dependencies':
                    scannerRes = await this.executeDependenciesScan(scanConfig, outputChannel);
                    break;

                case 'secrets':
                    throw new Error('Secrets scan not yet implemented');

                default:
                    throw new Error(`Unknown scan type: ${scanConfig.scanType}`);
            }

            const executionTime = Date.now() - startTime;

            // For local Docker execution, we don't have the raw context JSON
            // since scanners already parse it. Return an empty context for now.
            // TODO: Refactor scanners to preserve raw context JSON
            const contextJson = this.convertScannerResToContextJson(
                scannerRes,
                scanConfig.scanType
            );

            if (logCapture) {
                logCapture(`Local Docker scan completed in ${executionTime}ms`);
            }

            outputChannel.appendLine(`✓ Local scan completed in ${(executionTime / 1000).toFixed(2)}s`);
            outputChannel.appendLine('');

            return {
                success: scannerRes.getStatus(),
                contextJson,
                executionMode: 'local-docker',
                executionTime
            };

        } catch (error) {
            const executionTime = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            outputChannel.appendLine(`❌ Local Docker scan failed: ${errorMessage}`);
            outputChannel.appendLine('');
            
            if (logCapture) {
                logCapture(`Local scan error: ${errorMessage}`);
            }

            return {
                success: false,
                contextJson: '',
                executionMode: 'local-docker',
                executionTime,
                error: errorMessage
            };
        }
    }

    private async executeIacScan(
        scanConfig: IScanExecutionConfig,
        outputChannel: OutputChannel
    ): Promise<ScannerRes> {
        return await this.iacScanner.scan(
            scanConfig.target,
            outputChannel,
            scanConfig.containerImageName || '',
            scanConfig.iacTool || 'checkov',
            scanConfig.engineToolsVersion || '',
            scanConfig.containerEnginePath || 'docker',
            undefined // scanLoader
        );
    }

    private async executeImageScan(
        scanConfig: IScanExecutionConfig,
        outputChannel: OutputChannel
    ): Promise<ScannerRes> {
        return await this.imageScanner.scan(
            scanConfig.target,
            outputChannel,
            scanConfig.containerImageName || '',
            scanConfig.engineToolsVersion || '',
            scanConfig.containerEnginePath || 'docker',
            undefined // scanLoader
        );
    }

    private async executeDependenciesScan(
        scanConfig: IScanExecutionConfig,
        outputChannel: OutputChannel
    ): Promise<ScannerRes> {
        return await this.dependenciesScanner.scan(
            scanConfig.target,
            outputChannel,
            scanConfig.containerImageName || '',
            scanConfig.engineToolsVersion || '',
            scanConfig.containerEnginePath || 'docker',
            scanConfig.dependenciesToken || '',
            scanConfig.xrayMode || '',
            scanConfig.dependenciesTool || '',
            scanConfig.dependencyCheckDatabase || '',
            undefined // scanLoader
        );
    }

    /**
     * Converts ScannerRes to context JSON string
     * Note: This is a simplified implementation since scanners already parse the context
     * In a future refactor, scanners should preserve the raw context JSON
     */
    private convertScannerResToContextJson(
        scannerRes: ScannerRes,
        scanType: string
    ): string {
        const contextKey = this.getContextKeyForScanType(scanType);
        const findings = scannerRes.getFindings();
        
        // Create a minimal context structure from parsed findings
        const contextArray = findings.map(finding => ({
            id: finding.getId(),
            severity: finding.getSeverity(),
            where: finding.getWhere(),
            description: finding.getDescription(),
            module: finding.getModule(),
            tool: finding.getTool(),
            references: finding.getReferences(),
            priority: finding.getPriority(),
            ...finding.getAllAdditionalFields()
        }));

        const context = {
            [contextKey]: contextArray
        };

        return JSON.stringify(context);
    }

    private getContextKeyForScanType(scanType: string): string {
        const contextMap: Record<string, string> = {
            'iac': 'iac_context',
            'dependencies': 'dependencies_context',
            'image': 'container_context',
            'license': 'license_context',
            'secrets': 'secrets_context'
        };

        return contextMap[scanType] || `${scanType}_context`;
    }
}
