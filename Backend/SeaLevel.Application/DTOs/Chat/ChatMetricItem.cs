namespace SeaLevel.Application.DTOs.Chat;

public class ChatMetricItem
{
    public DateTime Date { get; set; }

    public double WindSpeedMs { get; set; }

    public double TemperatureC { get; set; }

    public double RelativeHumidityPct { get; set; }

    public double SeaLevelPressureHpa { get; set; }

    public double PredictedSeaLevelMm { get; set; }

    public double Value { get; set; }
}
