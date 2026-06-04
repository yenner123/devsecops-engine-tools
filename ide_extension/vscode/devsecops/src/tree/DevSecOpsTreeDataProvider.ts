import * as vscode from "vscode";
import { ScanResultItem } from "./results/ScanResultItem";
import { CategoryTreeItem } from "./CategoryTreeItem";
import { FindingItem } from "./results/finding/FindingItem";
import { Finding } from "../domain/model/Finding";

export class DevSecOpsTreeDataProvider
  implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<
    vscode.TreeItem | undefined | null | void
  > = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    vscode.TreeItem | undefined | null | void
  > = this._onDidChangeTreeData.event;
  private categories: CategoryTreeItem[] = [];
  private extensionPath: string;
  private scanResults: ScanResultItem[] = [];

  constructor(private context: vscode.ExtensionContext) {
    this.extensionPath = context.extensionPath;
    this.getItems();
  }

  public refresh(): void {
    this.getItems();
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  // In your addScanResult method
  public addScanResult(
    label: string,
    findings: Finding[],
    sourceType: "iac" | "image" | "dependencies" | "license",
    scanPath?: string
  ): void {
    const timestamp = new Date();
    const findingItems = findings.map((f) => new FindingItem(f, scanPath, sourceType));

    this.scanResults.unshift(
      new ScanResultItem(label, sourceType, timestamp, findingItems)
    );

    this.refresh();
  }

  public deleteScanResult(scanResult: ScanResultItem): void {
    const index = this.scanResults.indexOf(scanResult);
    if (index > -1) {
      this.scanResults.splice(index, 1);
      this.refresh();
    }
  }

  getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
    if (!element) {
      return Promise.resolve(this.categories);
    }

    if (element instanceof CategoryTreeItem) {
      return Promise.resolve(element.children);
    }

    if (element instanceof ScanResultItem) {
      return Promise.resolve(element.children);
    }

    return Promise.resolve([]);
  }

  private getItems(): void {
    const practicesItems: vscode.TreeItem[] = [];

    const iacScanItem = new vscode.TreeItem(
      "Infrastructure as Code Scan",
      vscode.TreeItemCollapsibleState.None
    );
    iacScanItem.command = {
      command: "devsecops.iacScan",
      title: "IAC_SCAN",
      arguments: [iacScanItem],
    };
    iacScanItem.iconPath = new vscode.ThemeIcon("breakpoints-view-icon");
    iacScanItem.tooltip =
      "Scan a folder for IaC vulnerabilities like k8s or dockerfiles";
    practicesItems.push(iacScanItem);

    const imageScanItem = new vscode.TreeItem(
      "Image Scan",
      vscode.TreeItemCollapsibleState.None
    );
    imageScanItem.command = {
      command: "devsecops.imageScan",
      title: "IMAGE_SCAN",
      arguments: [imageScanItem],
    };
    imageScanItem.iconPath = new vscode.ThemeIcon("breakpoints-view-icon");
    imageScanItem.tooltip = "Scan an image";
    practicesItems.push(imageScanItem);

    const dependenciesScanItem = new vscode.TreeItem(
      "Dependencies Scan",
      vscode.TreeItemCollapsibleState.None
    );
    dependenciesScanItem.command = {
      command: "devsecops.dependenciesScan",
      title: "DEPENDENCIES_SCAN",
      arguments: [dependenciesScanItem],
    };
    dependenciesScanItem.iconPath = new vscode.ThemeIcon("breakpoints-view-icon");
    dependenciesScanItem.tooltip =
      "Scan a folder for dependencies vulnerabilities like npm, pip, gradle, maven, yarn, etc.";
    practicesItems.push(dependenciesScanItem);

    this.categories = [
      new CategoryTreeItem(
        "Practices",
        vscode.TreeItemCollapsibleState.Expanded,
        practicesItems
      ),
      new CategoryTreeItem(
        "Results",
        vscode.TreeItemCollapsibleState.Expanded,
        this.scanResults
      ),
    ];
  }
}
