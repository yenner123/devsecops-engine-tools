import { OutputChannel } from "vscode";


/**
 * IScanExecutor - Strategy interface for scan execution
 * 
 * Abstracts the execution method of scans, allowing both local (Docker) 
 * and remote (Microservice) implementations to coexist.
 * 
 * Both implementations must return the same context JSON format that
 * will be mapped to findings by the ScanContextMapper.
 */
export interface IScanExecutor {
    /**
     * Executes a scan and returns the raw context JSON
     * 
     * @param scanConfig - Configuration for the scan
     * @param outputChannel - VS Code output channel for logging
     * @param logCapture - Optional callback to capture logs
     * @returns Raw context JSON string from scan execution
     */
    execute(
        scanConfig: IScanExecutionConfig,
        outputChannel: OutputChannel,
        logCapture?: (message: string) => void
    ): Promise<IScanExecutionResult>;

    /**
     * Returns the execution mode identifier
     */
    getExecutionMode(): 'local-docker' | 'remote-microservice';

    /**
     * Validates if the executor can run in the current environment
     * For local: checks Docker availability
     * For remote: checks microservice connectivity
     */
    canExecute(): Promise<boolean>;
}

/**
 * Configuration for scan execution
 */
export interface IScanExecutionConfig {
    scanType: 'image' | 'dependencies' | 'iac' | 'license' | 'secrets';
    target: string;  // Image name, folder path, etc.
    
    // Scanner configuration
    containerImageName?: string;
    engineToolsVersion?: string;
    containerEnginePath?: string;
    
    // Type-specific configs
    dependenciesToken?: string;
    xrayMode?: string;
    dependenciesTool?: string;
    dependencyCheckDatabase?: string;
    iacTool?: string;
    
    // Optional parameters
    timeout?: number;
    additionalArgs?: Record<string, string>;
}

/**
 * Result from scan execution
 */
export interface IScanExecutionResult {
    success: boolean;
    contextJson: string;  // Raw JSON context from scan
    executionMode: 'local-docker' | 'remote-microservice';
    executionTime?: number;
    error?: string;
}
