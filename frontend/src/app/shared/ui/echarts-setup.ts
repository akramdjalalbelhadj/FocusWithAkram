import { BarChart, HeatmapChart, LineChart, PieChart } from 'echarts/charts';
import { AriaComponent, CalendarComponent, DataZoomComponent, GridComponent, LegendComponent, TooltipComponent, VisualMapComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';

// Seuls les modules utilises sont embarques (tree-shaking), charges a la demande.
echarts.use([
  BarChart, LineChart, PieChart, HeatmapChart,
  DataZoomComponent, GridComponent, TooltipComponent, LegendComponent, VisualMapComponent, CalendarComponent, AriaComponent,
  CanvasRenderer,
]);

export { echarts };
