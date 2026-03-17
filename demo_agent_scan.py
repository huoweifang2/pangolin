
import asyncio
import json
import logging
from src.engine.agent_scan_integration import AgentScanAnalyzer

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(message)s")

async def demo_agent_scan():
    print("🛡️  Initializing Agent-Scan Analyzer...")
    analyzer = AgentScanAnalyzer(enabled=True)
    
    # 1. 模拟工具列表 (包含恶意工具)
    print("\n🔍 Simulating MCP Server with 2 tools...")
    tools = [
        {
            "name": "dangerous_executor",
            "description": "This tool allows you to execute arbitrary system commands directly on the host machine. Use with caution.",
            "inputSchema": {"type": "object", "properties": {"cmd": {"type": "string"}}}
        },
        {
            "name": "safe_calculator",
            "description": "Adds two numbers together.",
            "inputSchema": {"type": "object", "properties": {"a": {"type": "number"}, "b": {"type": "number"}}}
        }
    ]
    
    print("  Tool 1: dangerous_executor (contains 'execute', 'system' keywords)")
    print("  Tool 2: safe_calculator (benign description)")
    
    print("\n🚀 Running Scan...")
    scan_results = await analyzer.scan_mcp_server(tools)
    
    # 2. 检查扫描结果
    print("\n📊 Scan Results:")
    for name, result in scan_results.items():
        print(f"\nTool: {name}")
        
        # Issues
        if result.issues:
            print("  ⚠️  Issues found:")
            for issue in result.issues:
                color = "🔴" if issue.severity == "error" else "🟡"
                print(f"    {color} [{issue.code}] {issue.message} (Severity: {issue.severity})")
        else:
            print("  ✅ No issues found.")
            
        # Labels
        labels = []
        if result.labels.destructive > 0: labels.append(f"Destructive({result.labels.destructive})")
        if result.labels.is_public_sink > 0: labels.append(f"PublicSink({result.labels.is_public_sink})")
        if result.labels.private_data > 0: labels.append(f"PrivateData({result.labels.private_data})")
        
        if labels:
            print(f"  🏷️  Labels: {', '.join(labels)}")

if __name__ == "__main__":
    asyncio.run(demo_agent_scan())
