from pathlib import Path
path = Path("frontend/src/pages/Admin.tsx")
text = path.read_text()
start = text.index("function TrendChart")
end = text.index("type MetricsPanelProps")
new_block = """function TrendChart({ data }: TrendChartProps) {\n  return <div />;\n}\n\n"""
path.write_text(text[:start] + new_block + text[end:])
