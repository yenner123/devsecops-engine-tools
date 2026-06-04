import * as vscode from "vscode";

export class PracticesTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | void> = this._onDidChangeTreeData.event;

  constructor() {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(_element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
    if (_element) {
      return Promise.resolve([]);
    }

    const practices: vscode.TreeItem[] = [];

    const iacScanItem = new vscode.TreeItem(
      "Infrastructure as Code Scan",
      vscode.TreeItemCollapsibleState.None
    );
    iacScanItem.command = {
      command: "devsecops.iacScan",
      title: "IAC_SCAN",
      arguments: [iacScanItem],
    };
    iacScanItem.iconPath = new vscode.ThemeIcon("file-code");
    iacScanItem.tooltip = "Scan a folder for IaC vulnerabilities like k8s or dockerfiles";
    practices.push(iacScanItem);

    const imageScanItem = new vscode.TreeItem(
      "Image Scan",
      vscode.TreeItemCollapsibleState.None
    );
    imageScanItem.command = {
      command: "devsecops.imageScan",
      title: "IMAGE_SCAN",
      arguments: [imageScanItem],
    };
    imageScanItem.iconPath = new vscode.ThemeIcon("package");
    imageScanItem.tooltip = "Scan an image";
    practices.push(imageScanItem);

    const dependenciesScanItem = new vscode.TreeItem(
      "Dependencies Scan",
      vscode.TreeItemCollapsibleState.None
    );
    dependenciesScanItem.command = {
      command: "devsecops.dependenciesScan",
      title: "DEPENDENCIES_SCAN",
      arguments: [dependenciesScanItem],
    };
    dependenciesScanItem.iconPath = new vscode.ThemeIcon("extensions");
    dependenciesScanItem.tooltip = "Scan a folder for dependencies vulnerabilities like npm, pip, gradle, maven, yarn, etc.";
    practices.push(dependenciesScanItem);

    const licenseScanItem = new vscode.TreeItem(
      "License Scan",
      vscode.TreeItemCollapsibleState.None
    );
    licenseScanItem.command = {
      command: "devsecops.licenseScan",
      title: "LICENSE_SCAN",
      arguments: [licenseScanItem],
    };
    licenseScanItem.iconPath = new vscode.ThemeIcon("law");
    licenseScanItem.tooltip = "Scan a folder to classify dependency licenses with GRANT policy";
    practices.push(licenseScanItem);

    return Promise.resolve(practices);
  }
}
