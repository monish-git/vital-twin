from biogears_service.simulation import scenario_builder

# Mock data to test the XML generation
test_events = [
    {"event_type": "meal", "value": 500, "time_offset": 3600},
    {"event_type": "exercise", "value": 0.5, "time_offset": 7200}
]

path = scenario_builder.build_batch_reconstruction("U200", "dummy_path", test_events)
with open(path, 'r') as f:
    print("--- GENERATED XML CONTENT ---")
    print(f.read())
    print("-----------------------------")