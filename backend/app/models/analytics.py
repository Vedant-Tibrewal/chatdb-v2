"""Analytics data models."""

from pydantic import BaseModel


class ChartCard(BaseModel):
    id: str
    title: str
    type: str  # metric, horizontal_bar, donut, line, area, treemap
    data: list[dict] | None = None
    value: str | float | int | None = None
    subtitle: str | None = None
    center_stat: str | None = None  # label shown in donut center
    sparkline: list[float] | None = None  # trend data for metric cards


class AnalyticsResponse(BaseModel):
    domain: str
    cards: list[ChartCard]
