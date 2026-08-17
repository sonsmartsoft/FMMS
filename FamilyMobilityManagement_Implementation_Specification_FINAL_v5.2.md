# THÔNG TIN BỔ SUNG CHO ANTIGRAVITY — BỐI CẢNH & YÊU CẦU NGHIỆP VỤ
> **LƯU Ý QUAN TRỌNG:** Phần này chỉ nhằm cung cấp **bối cảnh, mục tiêu và yêu cầu nghiệp vụ của người dùng** để Antigravity hiểu đúng sản phẩm cần xây dựng.  
> **Không phải specification kỹ thuật, không phải yêu cầu về framework, database, API, UI implementation hoặc cách lập trình.**  
> Các quyết định kỹ thuật phải được thực hiện dựa trên phần Implementation Specification phía dưới.

## 1. MỤC ĐÍCH CỦA HỆ THỐNG

Tôi muốn xây dựng một hệ thống cá nhân để quản lý **toàn bộ phương tiện và tài sản di chuyển của gia đình**, không chỉ riêng ô tô.

Hệ thống cần giúp tôi có một nơi duy nhất để:

- Quản lý danh sách tất cả phương tiện.
- Lưu thông tin cơ bản và hình ảnh của từng phương tiện.
- Theo dõi quá trình sử dụng.
- Theo dõi quãng đường / số km / số chuyến.
- Theo dõi nhiên liệu hoặc pin tùy loại phương tiện.
- Theo dõi bảo dưỡng, sửa chữa và thay thế phụ tùng.
- Theo dõi các hạng mục nâng cấp/phụ kiện.
- Theo dõi toàn bộ chi phí.
- Theo dõi khoản vay và lịch trả nợ nếu có.
- Theo dõi bảo hiểm, đăng ký, đăng kiểm và giấy tờ.
- Theo dõi giá trị mua và giá trị hiện tại của tài sản.
- Phân tích tổng chi phí sở hữu và chi phí sử dụng.
- Xem dữ liệu tổng hợp của cả gia đình hoặc xem chi tiết từng phương tiện.

## 2. CÁC LOẠI PHƯƠNG TIỆN CẦN QUẢN LÝ

Hệ thống phải có khả năng quản lý:

- Ô tô.
- Xe máy.
- Motor phân khối lớn.
- Xe đạp thể thao.
- Xe đạp đường trường / Road Bike.
- MTB.
- Gravel Bike.
- E-Bike / xe đạp điện.
- Scooter.
- Các phương tiện khác có thể phát sinh trong tương lai.

Không được hiểu hệ thống chỉ dành cho ô tô.

## 3. NGUYÊN TẮC QUAN TRỌNG

Mỗi phương tiện có đặc điểm và thông tin khác nhau.

Ví dụ:

**Mazda2:**
- Có biển số.
- Có nhiên liệu.
- Có động cơ.
- Có OBD.
- Có GPS.
- Có bảo dưỡng.
- Có khoản vay.
- Có bảo hiểm.

**Motorcycle:**
- Có biển số.
- Có nhiên liệu.
- Có động cơ.
- Có thể có OBD/GPS tùy thiết bị.
- Có bảo dưỡng và phụ tùng.

**Road Bike:**
- Không có nhiên liệu.
- Không có OBD.
- Không có biển số trong trường hợp thông thường.
- Quan trọng là quãng đường đạp, số chuyến, tốc độ, component, phụ tùng và nâng cấp.

**E-Bike:**
- Có pin.
- Có mức pin.
- Có quãng đường.
- Có phạm vi hoạt động ước tính.
- Có lịch sử sạc và tình trạng pin.

Do đó hệ thống phải linh hoạt và chỉ hiển thị những thông tin phù hợp với từng loại phương tiện.

## 4. DASHBOARD MONG MUỐN

Dashboard là màn hình trung tâm khi mở Web App.

Tôi muốn nhìn thấy **các phương tiện bằng hình ảnh đại diện**, thay vì chỉ là một bảng dữ liệu khô.

Ví dụ:

```text
FAMILY MOBILITY

[ + Thêm phương tiện ]       [ Bộ lọc ] [ Cài đặt ]

┌────────────────────┐  ┌────────────────────┐
│                    │  │                    │
│      ẢNH XE        │  │    ẢNH XE ĐẠP      │
│                    │  │                    │
├────────────────────┤  ├────────────────────┤
│ Mazda2 Base 2026   │  │ Road Bike          │
│ Ô TÔ               │  │ XE ĐẠP THỂ THAO    │
│                    │  │                    │
│ Giá mua: 520M ₫    │  │ Giá mua: 85M ₫     │
│ Biển số: 30A-...   │  │ Distance: 2,842 km │
│ Mileage: 12,846 km │  │ Rides: 42          │
│ Fuel: 54%          │  │ Avg: 29.6 km/h     │
└────────────────────┘  └────────────────────┘
```

Mục tiêu là khi nhìn Dashboard tôi có thể **nhận biết ngay từng phương tiện và tình trạng quan trọng của nó**.

## 5. NGƯỜI DÙNG PHẢI TỰ CẤU HÌNH DASHBOARD

Tôi không muốn thông tin trên card bị cố định.

Trong Settings cần cho phép tôi chọn:

- Thông tin nào được hiển thị.
- Thông tin nào không hiển thị.
- Thứ tự hiển thị.
- Có hiển thị ảnh hay không.
- Kiểu hiển thị card.
- Cách sắp xếp các phương tiện.
- Các thông tin tổng hợp nào xuất hiện ở Dashboard.

Ví dụ tôi có thể chọn:

```text
☑ Ảnh
☑ Tên phương tiện
☑ Loại phương tiện
☑ Giá mua
☑ Biển số
☑ Mileage
☑ Fuel
☐ VIN
☐ Khoản vay
☑ Bảo dưỡng sắp tới
```

Sau này tôi có thể thay đổi cấu hình mà không cần thay đổi dữ liệu phương tiện.

## 6. CLICK VÀO PHƯƠNG TIỆN

Khi click vào card của một phương tiện, tôi muốn đi vào **trang quản lý chi tiết của chính phương tiện đó**.

Ví dụ Mazda2:

```text
Mazda2 Base 2026

Overview
Operation
Trips
Fuel
Maintenance
Parts
Upgrades
Expenses
Finance
Insurance
Documents
Analytics
```

Đối với Road Bike:

```text
Road Bike

Overview
Rides
Components
Maintenance
Parts
Upgrades
Expenses
Documents
Analytics
```

Các menu phải thay đổi theo đặc điểm của phương tiện.

## 7. PHẦN ANDROID TRÊN XE

Ngoài Web App, hệ thống còn có ứng dụng Android chạy trên màn hình ZESTECH 9 inch của Mazda2.

Đây là phần **vận hành và thu thập dữ liệu trực tiếp trên xe**.

Tôi muốn giữ đầy đủ các chức năng đã thống nhất trước đó, đặc biệt:

- Kết nối OBD-II Bluetooth.
- Đọc dữ liệu ECU/PID thực tế.
- Hiển thị dữ liệu xe theo thời gian thực.
- Thu thập dữ liệu chuyến đi.
- GPS.
- Tính quãng đường.
- Theo dõi nhiên liệu.
- Tính mức tiêu thụ trung bình.
- Ước tính lượng xăng còn lại.
- Ước tính số km còn đi được.
- Lưu dữ liệu theo ngày.
- Thống kê ngày/tháng/năm.
- Lưu offline khi không có Internet.
- Đồng bộ lên Cloud khi có mạng.
- Có thể backup dữ liệu.
- Có thể xuất dữ liệu sang Google Sheets.
- Hỗ trợ nhiều xe.

## 8. LƯU Ý ĐẶC BIỆT VỚI MAZDA2 BASE 2026

Mazda2 Base là phiên bản có thông tin hiển thị trên đồng hồ khá hạn chế.

Vì vậy không được mặc định rằng OBD sẽ cung cấp được tất cả thông tin mong muốn.

Tôi muốn hệ thống thực tế kiểm tra dữ liệu OBD mà thiết bị đọc được.

Đặc biệt cần xác định:

- Có đọc được ODO hay không.
- Có đọc được Fuel Level hay không.
- Có đọc được Fuel Rate hay không.
- Có đọc được tốc độ hay không.
- Có đọc được RPM hay không.
- Có đọc được nhiệt độ nước làm mát hay không.
- Có đọc được các PID khác hay không.

Nếu ODO không lấy được từ xe thì **không coi đó là lỗi hệ thống**.

Khi đó có thể dùng GPS để tính quãng đường và xây dựng **Virtual Odometer / App Mileage**.

Giá trị này phải được phân biệt rõ với ODO chính thức của xe.

## 9. DỮ LIỆU PHẢI CÓ THỂ PHỤC VỤ QUẢN LÝ LÂU DÀI

Mục tiêu không chỉ là xem dữ liệu realtime.

Tôi muốn sau vài năm hệ thống có thể trả lời các câu hỏi như:

- Xe này đã chạy bao nhiêu km?
- Tháng này chạy bao nhiêu km?
- Năm nay tốn bao nhiêu tiền xăng?
- Chi phí trung bình/km là bao nhiêu?
- Đã bảo dưỡng những gì?
- Bao giờ cần bảo dưỡng tiếp?
- Đã thay những phụ tùng nào?
- Đã nâng cấp những gì?
- Tổng tiền đã đầu tư vào xe là bao nhiêu?
- Khoản vay còn bao nhiêu?
- Tổng chi phí sở hữu xe là bao nhiêu?
- Giá trị hiện tại ước tính bao nhiêu?
- Xe nào đang có chi phí sử dụng cao nhất?

Đối với xe đạp:

- Đã đạp bao nhiêu km?
- Bao nhiêu chuyến?
- Component nào đã chạy bao nhiêu km?
- Bao giờ cần thay chain/cassette/tire?
- Tổng tiền đã đầu tư vào xe?
- Giá trị hiện tại?

## 10. TRIẾT LÝ CỦA SẢN PHẨM

Đây là **hệ thống quản lý tài sản di chuyển cá nhân của gia đình**, không phải chỉ là một app OBD.

OBD chỉ là một nguồn dữ liệu của một loại phương tiện.

Mục tiêu cuối cùng là:

```text
                 FAMILY MOBILITY
                       │
        ┌──────────────┼──────────────┐
        │              │              │
       CAR         MOTORCYCLE       BICYCLE
        │              │              │
       OBD           GPS/OBD         Ride Data
        │              │              │
        └──────────────┼──────────────┘
                       │
                       ▼
               CENTRAL DATA
                       │
                       ▼
             FAMILY DASHBOARD
                       │
        ┌──────────────┼──────────────┐
        │              │              │
     Operation     Maintenance      Finance
        │              │              │
       Fuel           Parts         Expenses
       Trips          Upgrades      Loans
       Mileage        Repairs       Insurance
```

**Mục tiêu của phần thông tin này là giúp Antigravity hiểu đúng bài toán và ý định sử dụng thực tế. Không cần biến phần này thành code hoặc thay thế Implementation Specification kỹ thuật bên dưới.**

---

# MAZDA CAR DATA LOGGER
## Multi-Vehicle Android OBD Telemetry Platform
### ZESTECH 9-inch ADAS + KONNWEI KW906 + Supabase + Google Sheets

## 1. OBJECTIVE
Build a production-ready native Android application for the 9-inch ZESTECH ADAS in a Mazda2 Base 2026.

The same app must support multiple vehicles. All vehicles synchronize to one central Supabase PostgreSQL database and remain separated by `vehicle_id`.

Core functions:
- Real-time OBD-II telemetry
- Bluetooth OBD connection
- Automatic trip detection
- Odometer/distance
- Fuel level
- Fuel consumption
- Estimated fuel remaining
- Estimated driving range
- Refueling records
- Fuel cost and cost/km
- Daily/weekly/monthly/yearly statistics
- GPS
- Offline local storage
- Automatic cloud synchronization
- Multi-vehicle management
- Fleet dashboard
- Google Sheets reporting/export
- Maintenance
- Backup/restore
- Diagnostic logging
- Bluetooth auto-reconnect

Implement the complete system directly. Do not create separate Phase 0/1/2 applications and do not use fake telemetry.

## 2. HARDWARE
Vehicle:
- Mazda2 Base 2026, petrol
- Architecture must support other vehicles later.

ZESTECH:
- 9-inch automotive display
- Android 13
- approximately 2000 × 1200 class resolution
- landscape
- Bluetooth, Wi-Fi, GPS

UI must be designed for a 9-inch automotive screen, not a phone.

OBD:
- KONNWEI KW906
- ELM327-compatible
- Bluetooth
- CAN
- advertised PIC18F25K80

Support both Bluetooth Classic/SPP and BLE through:
`OBDTransport`
- `BluetoothClassicTransport`
- `BluetoothBleTransport`

## 3. TECHNOLOGY
Use native Android:
- Kotlin
- Android SDK
- Jetpack Compose
- Material 3
- MVVM / Clean Architecture
- Coroutines
- Flow / StateFlow
- Room / SQLite
- WorkManager
- Android Bluetooth APIs
- Android Location APIs
- Supabase Auth/PostgreSQL
- Supabase Storage where useful
- Google Sheets API
- Google OAuth

Do not use Flutter or React Native.

## 4. ARCHITECTURE

```text
Vehicles
  ├─ Vehicle 1 ─ ZESTECH ─ KW906
  ├─ Vehicle 2 ─ ZESTECH ─ KW906
  └─ Vehicle 3 ─ ZESTECH ─ KW906
                       |
                 OBD Bluetooth
                       |
                ELM327 Engine
                       |
                  PID Manager
                       |
                 Telemetry Engine
                  /                       Room DB         GPS
                  \          /
                   Trip Engine
                 /      |                    Fuel   Statistics  Maintenance
                 \      |       /
                    Sync Engine
                    /                        Supabase    Google Sheets
                    |
             Fleet Dashboard
```

## 5. MULTI-VEHICLE
Use one central database, not one database per car.

Hierarchy:
```text
User
 └─ Fleet
     ├─ Vehicle 001
     │   ├─ Device
     │   ├─ Trips
     │   ├─ Fuel
     │   ├─ Telemetry
     │   └─ Maintenance
     ├─ Vehicle 002
     └─ Vehicle 003
```

Every vehicle-specific table MUST contain `vehicle_id`.

## 6. DATABASE MODEL

### users
`id, email, name, created_at, updated_at`

### fleets
`id, owner_user_id, name, description, created_at, updated_at`

### vehicles
`id, fleet_id, vin, license_plate, make, model, year, trim, engine, fuel_type, tank_capacity_liters, odometer_km, active, created_at, updated_at`

### devices
`id, vehicle_id, device_type, device_name, mac_address, serial_number, app_version, last_seen, status, created_at, updated_at`

### trips
`id, vehicle_id, device_id, start_time, end_time, start_odometer, end_odometer, distance_km, duration_seconds, fuel_start_percent, fuel_end_percent, fuel_used_liters, average_consumption_l100km, average_speed_kmh, max_speed_kmh, start_latitude, start_longitude, end_latitude, end_longitude, status, created_at, updated_at`

### telemetry_samples
`id, vehicle_id, device_id, trip_id, timestamp, rpm, speed_kmh, engine_load_percent, coolant_temp_c, intake_temp_c, maf_gps, throttle_percent, fuel_level_percent, fuel_rate_lph, battery_voltage, engine_runtime_seconds, stft, ltft, odometer_km, latitude, longitude, gps_speed_kmh, gps_accuracy, connection_quality, data_quality, raw_source, created_at`

### fuel_logs
`id, vehicle_id, timestamp, odometer_km, fuel_liters, price_per_liter, total_cost, currency, station, tank_full, notes, created_at, updated_at`

### daily_summaries
`id, vehicle_id, date, distance_km, fuel_used_liters, average_consumption_l100km, fuel_cost, cost_per_km, average_speed_kmh, trip_count, created_at, updated_at`

### monthly_summaries
`id, vehicle_id, year, month, distance_km, fuel_used_liters, average_consumption_l100km, fuel_cost, cost_per_km, trip_count, created_at, updated_at`

### maintenance_logs
`id, vehicle_id, maintenance_type, date, odometer_km, cost, currency, notes, next_due_km, next_due_date, created_at, updated_at`

### sync_queue
`id, vehicle_id, entity_type, entity_id, operation, payload, created_at, retry_count, last_error, status, synced_at`

### obd_profiles
`id, vehicle_id, adapter_id, protocol, elm_version, supported_pids, polling_profile, created_at, updated_at`

## 7. LOCAL-FIRST
Room/SQLite is the primary local database.

```text
OBD → Telemetry → Room SQLite → Sync Queue → Cloud
```

The app must work with no Internet. Never send OBD data directly to cloud.

## 8. SUPABASE
Use one Supabase project/database for all vehicles.

Use Supabase Auth and Row Level Security. Users can only access their authorized fleet/vehicles.

Cloud stores:
- vehicles
- devices
- trips
- fuel_logs
- daily_summaries
- monthly_summaries
- maintenance_logs

Raw telemetry remains local by default. Optional cloud raw backup uploads in batches.

## 9. DEVICE REGISTRATION
First setup:
```text
DEVICE SETUP
Device ID: AUTO GENERATED
Vehicle: [Select Vehicle]
Adapter: [KW906]
[REGISTER DEVICE]
```

Maintain `device_id ↔ vehicle_id`.

A device must not upload under another vehicle without explicit authorized reassignment.

## 10. VEHICLE MANAGEMENT
Functions:
- Add
- Edit
- Remove
- Set active
- Assign device
- Unassign device

Fields:
- Make
- Model
- Year
- Trim
- License Plate
- VIN
- Engine
- Fuel Type
- Tank Capacity
- Current Odometer

Initial:
Mazda / Mazda2 / 2026 / Base / Petrol

Tank capacity remains configurable until verified.

## 11. OBD CONNECTION
Implement `OBDConnectionManager`:
- scan
- pair
- connect/disconnect
- reconnect
- transport detection
- adapter identification
- latency
- errors

States:
`DISCONNECTED, SCANNING, CONNECTING, CONNECTED, RECONNECTING, ERROR`

Auto reconnect is mandatory.

## 12. ELM327
Initialization:
```text
ATZ
ATE0
ATL0
ATS0
ATH0
ATSP0
```
Automatically detect protocol.

Record adapter response, firmware, protocol and PID bitmap.

## 13. PID MANAGEMENT
Generic PID definition:
```text
pid
command
description
parser
unit
polling_rate
supported
last_value
last_timestamp
quality
```

Initial PIDs:
- 010C RPM
- 010D Vehicle Speed
- 0104 Engine Load
- 0105 Coolant Temperature
- 0106 STFT Bank 1
- 0107 LTFT Bank 1
- 010B Intake Manifold Pressure
- 010F Intake Air Temperature
- 0110 MAF
- 0111 Throttle Position
- 012F Fuel Tank Level
- 0131 Engine Runtime
- 0142 Control Module Voltage
- 015E Engine Fuel Rate

Supported PID discovery:
`0100, 0120, 0140, 0160, 0180, 01A0`

Odometer is NOT assumed to be a standard PID.

Implement:
`OdometerProvider`
- StandardOBD
- VehicleSpecific
- GPSFallback

Never invent odometer data.

## 14. MAZDA-SPECIFIC PROFILE
Isolate vehicle-specific logic:
```text
VehicleProfile
 ├─ GenericOBD
 └─ Mazda2_2026
```
Allow future manufacturer-specific/extended CAN support. Do not hard-code unverified Mazda data.

## 15. RAW OBD LOGGING
Production diagnostic setting:
`Diagnostic Logging: OFF / ON`

Log:
- timestamp
- command
- raw response
- pid
- parsed value
- unit
- status
- error

Export CSV/JSON/TXT.

## 16. POLLING
FAST 250–500 ms:
- RPM
- Speed

NORMAL 1 s:
- Engine load
- Throttle
- Coolant
- MAF
- Fuel rate
- Voltage

SLOW 5–10 s:
- Fuel level
- Runtime
- Long-term trims

Configurable profiles:
- Eco
- Normal
- High Detail

Use batch writes. If ECU/adapter becomes unstable, lower polling, retry, reconnect and log.

## 17. TELEMETRY
TelemetrySample:
```text
timestamp
vehicleId
deviceId
tripId
rpm
speedKmh
engineLoadPercent
coolantTempC
intakeTempC
mafGps
throttlePercent
fuelLevelPercent
fuelRateLph
batteryVoltage
engineRuntimeSeconds
stft
ltft
odometerKm
latitude
longitude
gpsSpeedKmh
gpsAccuracy
connectionQuality
dataQuality
rawSource
```

All sensor fields nullable.

Never use zero to represent unsupported data.

Quality:
`VALID, STALE, ESTIMATED, UNAVAILABLE`

## 18. TRIP ENGINE
Trip starts when engine/movement is detected.
Trip ends when engine is off or engine off + no movement for 3 minutes. Timeout configurable.

Temporary Bluetooth disconnect must NOT end a trip.

Trip summary includes:
- start/end time
- start/end odometer
- distance
- duration
- fuel start/end
- fuel used
- L/100km
- average/max speed
- GPS start/end
- status

## 19. DISTANCE
Priority:
1. Odometer
2. GPS fallback

Odometer distance:
`end_odometer - start_odometer`

GPS filtering:
- reject impossible jumps
- reject unrealistic speed
- accuracy threshold
- handle signal loss

## 20. FUEL
If PID 012F supported:
`fuel_percent`

Estimated liters:
`tank_capacity_liters × fuel_percent / 100`

Mark this as estimated unless calibrated.

If PID 015E supported:
`fuel_rate_lph`

Fuel used:
`SUM(fuel_rate_lph × delta_time_hours)`

Consumption:
`fuel_used / distance_km × 100`

If fuel rate unavailable, use best available alternative and mark result ESTIMATED.

## 21. REFUELING
Screen:
```text
ADD FUEL
Vehicle
Odometer
Fuel Added
Price/L
Total
Full / Partial
Station
Notes
SAVE
```

Full-tank events are calibration points.

## 22. FUEL CALIBRATION
Use actual refueling between full-tank events:
```text
Previous Full
→ Distance
→ Next Full
→ Actual Liters Added
→ Actual L/100km
```

Use this to improve long-term consumption accuracy.

## 23. ESTIMATED RANGE
Formula:
`range_km = fuel_remaining_liters / consumption_l100km × 100`

Profiles:
- Last 10 trips
- Last 100 km
- Last 500 km
- Last 30 days
- Lifetime

Default Last 500 km if sufficient data; fallback to 100 km, 10 trips, then lifetime.

If insufficient:
`RANGE — Learning...`

## 24. 9-INCH DASHBOARD
Landscape, dark, high contrast, large numbers and touch targets.

Recommended:
```text
┌──────────────────────────────────────────────────────────┐
│ MAZDA 2                         ● OBD CONNECTED           │
│ 30A-12345                                                │
├──────────────────────────────────────────────────────────┤
│                    RANGE 365 km                          │
│                                                          │
│             FUEL 62%        24.8 L                      │
│                                                          │
│       6.9 L/100km             62 km/h                   │
│       AVG CONSUMPTION         SPEED                     │
├──────────────────────────────────────────────────────────┤
│ TODAY                                                    │
│ DISTANCE        FUEL USED        COST                    │
│ 68.2 km         4.70 L           101,000 ₫              │
├──────────────────────────────────────────────────────────┤
│ RPM       COOLANT       LOAD       VOLTAGE               │
│ 2150       91°C          31%        14.1V                │
└──────────────────────────────────────────────────────────┘
```

## 25. NAVIGATION
Large touch-friendly:
`HOME | TRIPS | FUEL | STATS | MORE`

MORE:
- Live Data
- Vehicles
- Diagnostics
- Maintenance
- Cloud
- Settings

## 26. LIVE DATA
Show available:
RPM, Speed, Engine Load, Throttle, Coolant, Intake Air, MAF, Fuel Level, Fuel Rate, Battery, Odometer, STFT, LTFT.

Unsupported:
`N/A / PID not supported`

## 27. TRIPS
Filters:
- Today
- This Week
- This Month
- This Year
- Custom
- Vehicle

Trip detail:
- route if GPS
- distance
- time
- fuel
- consumption
- average/max speed
- telemetry summary

## 28. FLEET DASHBOARD
For multiple vehicles:
```text
FLEET DASHBOARD
Vehicles: 12
Distance: 3,842 km
Fuel: 286 L
Average: 7.45 L/100km
Fuel Cost: 6.2M VND

Vehicle     KM       L/100km    Fuel     Status
Mazda2      1,240      6.8       84 L      ●
Mazda3        856      7.2       62 L      ●
CX-5        1,102      8.1       91 L      ●
```

Support vehicle filter, date filter, sort and search.

## 29. VEHICLE SELECTOR
Active vehicle:
`[ Mazda2 ▼ ]`

Dropdown:
- Mazda2 - plate
- Mazda3 - plate
- CX-5 - plate

Changing vehicle changes dashboard queries by `vehicle_id`.

## 30. STATISTICS
Per vehicle:
- daily/weekly/monthly/yearly distance
- fuel used
- average L/100km
- fuel cost
- cost/km
- average speed
- trip count

Charts:
- distance
- consumption
- fuel cost
- cost/km
- mileage trend

## 31. FUEL SCREEN
Show:
- current %
- estimated liters
- range
- average consumption
- refill history
- cost

## 32. GPS
Use Android Location APIs. Store latitude, longitude, accuracy, speed and timestamp.

GPS optional. OBD must work without GPS.

## 33. OFFLINE-FIRST SYNC
```text
Internet OFF
→ Room
→ Sync Queue PENDING
→ Internet ON
→ WorkManager
→ Supabase
→ SYNCED
```

No data loss.

## 34. DUPLICATE PROTECTION
Generate stable local UUIDs. Cloud sync must be idempotent using unique constraints/upsert. Re-uploading a record must not create duplicates.

## 35. WORKMANAGER
Use for:
- cloud synchronization
- backups
- summary generation if needed
- Google Sheets synchronization

## 36. GOOGLE SHEETS
Reporting/export only, not primary database.

Workbook:
- Vehicles
- Trips
- Fuel
- Daily
- Monthly
- Maintenance

All sheets include vehicle ID and vehicle identification.

## 37. GOOGLE AUTH
Use Google OAuth. Never embed service-account private keys in APK.

Settings:
- account
- spreadsheet
- sync now
- last sync
- status

## 38. MAINTENANCE
Types:
- Engine oil
- Oil filter
- Air filter
- Cabin filter
- Spark plugs
- Brake
- Tires
- Other

Fields:
type, date, odometer, cost, notes, next due km/date.

## 39. BACKUP/RESTORE
Formats:
CSV, JSON, ZIP

Include:
- vehicles
- trips
- fuel
- summaries
- maintenance
- settings
- OBD profiles

Allow export/import. Supabase remains central cloud backup.

## 40. BACKGROUND OPERATION
Support:
- Bluetooth reconnect
- background telemetry
- Android foreground service where required
- wake handling
- ZESTECH reboot recovery
- optional auto-start
- safe shutdown
- transaction protection

After reboot:
1. Start app if enabled
2. Load active vehicle
3. Connect KW906
4. Restore telemetry service

## 41. ERROR HANDLING
Handle gracefully:
- adapter missing
- Bluetooth disabled
- GPS unavailable
- Internet unavailable
- Supabase unavailable
- unsupported PID
- malformed response

Do not crash.

Status:
`OBD CONNECTED / DISCONNECTED / RECONNECTING / GPS AVAILABLE / CLOUD SYNCED / CLOUD OFFLINE / SHEETS SYNCED`

## 42. PERFORMANCE
- no DB work on UI thread
- coroutines
- Flow
- batch telemetry inserts
- efficient indexes
- bounded memory
- minimal cloud requests
- target smooth 60 FPS where supported

## 43. DATA RETENTION
Default:
- raw telemetry: 90 days locally
- trips: unlimited
- fuel: unlimited
- summaries: unlimited
- maintenance: unlimited

Configurable raw retention.

## 44. SECURITY
Never hard-code:
- Supabase service-role key
- Google private key
- passwords
- server-side secrets

Use Supabase Auth, RLS, Android secure storage and HTTPS/TLS.

## 45. REPOSITORIES
Create:
```text
VehicleRepository
DeviceRepository
TelemetryRepository
TripRepository
FuelRepository
StatisticsRepository
MaintenanceRepository
SyncRepository
```

UI must not directly access Room or Supabase.

## 46. PROJECT STRUCTURE
```text
MazdaCarLogger/
├── app/
├── core/
│   ├── bluetooth/
│   ├── obd/
│   ├── database/
│   ├── network/
│   ├── common/
│   └── security/
├── data/
│   ├── local/
│   ├── remote/
│   └── repository/
├── domain/
│   ├── vehicle/
│   ├── telemetry/
│   ├── trip/
│   ├── fuel/
│   ├── statistics/
│   ├── maintenance/
│   └── sync/
└── feature/
    ├── dashboard/
    ├── live/
    ├── trips/
    ├── fuel/
    ├── statistics/
    ├── vehicles/
    ├── maintenance/
    ├── diagnostics/
    ├── cloud/
    └── settings/
```

## 47. IMPLEMENTATION RULES
1. Implement complete architecture directly.
2. No fake telemetry.
3. Build for the actual 9-inch ZESTECH display.
4. Multi-vehicle from the beginning.
5. One central Supabase database.
6. Every vehicle-specific record contains `vehicle_id`.
7. Every device is mapped to a vehicle.
8. Room/SQLite works offline.
9. Cloud sync is asynchronous.
10. Google Sheets is reporting/export only.
11. Never expose secrets in APK.
12. Never invent unsupported OBD data.
13. Unsupported data = N/A / Unavailable.
14. Vehicle-specific OBD logic is isolated.
15. Temporary Bluetooth loss does not terminate trip.
16. Internet loss does not stop telemetry.
17. Cloud sync is idempotent.
18. Use actual Mazda2 + KW906 responses.
19. Preserve raw diagnostic logs for troubleshooting.
20. Optimize for reliable telemetry before cosmetic animations.

## 48. REAL VEHICLE VALIDATION
After installation:
1. Pair KW906
2. Connect
3. Detect ELM327
4. Detect protocol
5. Discover PIDs
6. Read supported PIDs
7. Start trip
8. Record telemetry
9. Stop trip
10. Generate trip summary
11. Save Room
12. Sync Supabase
13. Verify vehicle_id
14. Verify Google Sheets
15. Reboot ZESTECH
16. Verify automatic recovery

## 49. ACCEPTANCE CHECKLIST
[ ] Android build succeeds
[ ] APK installs on ZESTECH
[ ] 9-inch landscape UI works
[ ] KW906 Bluetooth works
[ ] Auto reconnect works
[ ] ELM327 initialization works
[ ] Protocol detection works
[ ] PID discovery works
[ ] RPM works if supported
[ ] Speed works if supported
[ ] Coolant works if supported
[ ] Engine load works if supported
[ ] MAF works if supported
[ ] Throttle works if supported
[ ] Fuel level works if supported
[ ] Fuel rate works if supported
[ ] Odometer works if available
[ ] Unsupported PIDs show N/A
[ ] Raw OBD logging works
[ ] Automatic trip works
[ ] Distance works
[ ] Fuel consumption works
[ ] Range estimation works
[ ] Refueling works
[ ] Fuel calibration works
[ ] Daily/monthly summaries work
[ ] Fuel cost works
[ ] Cost/km works
[ ] SQLite persistence works
[ ] Offline mode works
[ ] Supabase sync works
[ ] Retry works
[ ] Duplicate protection works
[ ] Supabase RLS works
[ ] Google Sheets sync works
[ ] Backup/restore works
[ ] Maintenance works
[ ] Multi-vehicle works
[ ] Vehicle filtering works
[ ] Fleet dashboard works
[ ] Device-to-vehicle mapping works
[ ] ZESTECH reboot recovery works

## 50. FINAL USER FLOW
```text
ZESTECH boots
→ App starts
→ Active vehicle loaded
→ KW906 auto-connect
→ OBD protocol detected
→ Telemetry starts
→ Trip auto-starts

Driving:
RPM / Speed / Fuel / Consumption / Range / Coolant / Voltage

Trip ends:
→ Trip closes
→ Distance calculated
→ Fuel used calculated
→ Consumption calculated
→ Daily summary updated
→ Local DB saved
→ Cloud sync queued

Internet available:
Room → Sync Queue → Supabase → Fleet Dashboard → Google Sheets
```

## 51. FINAL ARCHITECTURE
```text
                ┌──────────────────────────┐
                │       SUPABASE           │
                │      CENTRAL DB          │
                └────────────┬─────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
       Vehicle 1          Vehicle 2          Vehicle 3
          │                  │                  │
       ZESTECH 9"         ZESTECH 9"         ZESTECH 9"
          │                  │                  │
        KW906              KW906              KW906
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                      Same Android App
                             │
                   ┌─────────┴─────────┐
                   │                   │
                Room SQLite           GPS
                   │                   │
                   └─────────┬─────────┘
                             │
                      Trip / Fuel Engine
                             │
                   ┌─────────┴─────────┐
                   │                   │
                Supabase          Google Sheets
                   │
              Fleet Dashboard
```

## 52. DELIVERABLES
Antigravity must produce:
1. Complete Android source code
2. Debug APK
3. Release APK
4. Room database
5. Supabase SQL schema
6. Supabase RLS policies
7. Google Sheets integration
8. OBD/PID parser
9. Multi-vehicle management
10. Fleet dashboard
11. Vehicle dashboard
12. Diagnostic logging
13. Backup/restore
14. README
15. ZESTECH installation guide
16. KW906 configuration guide
17. Supabase setup guide
18. Google OAuth setup guide
19. Database migrations
20. Test checklist



# FAMILY MOBILITY MANAGEMENT SYSTEM — FINAL IMPLEMENTATION SPECIFICATION

## 54. SYSTEM SCOPE
Expand the project into a Family Mobility Management System (FMMS). The Web App is a separate product/module from the in-car Android app, but both use the same Supabase database. The Android app remains a full-featured in-car application.

```text
FAMILY VEHICLE MANAGEMENT SYSTEM
├── Web: Dashboard, Vehicles, Vehicle Operation, Fuel, Expenses, Maintenance,
│        Parts, Upgrades, Finance/Loans, Insurance/Registration, Documents,
│        Analytics, Reports
└── Android: Live OBD, Trips, Distance, Fuel, Range, GPS, Refueling,
             Statistics, Diagnostics, Maintenance, Offline DB, Cloud Sync
```

## 55. MAZDA2 BASE 2026 — ODOMETER STRATEGY
The Mazda2 Base 2026 may expose very limited useful odometer information. The system MUST NOT depend on the factory/dashboard ODO as the only distance source.

Implement:

```text
OdometerProvider
├── StandardOBD        # only if verified
├── VehicleSpecific    # only after verified Mazda/CAN decoding
├── GPSDistance        # practical fallback
└── ManualOdometer     # calibration/correction
```

Priority:

```text
1. Verified OBD/CAN ODO
2. Verified vehicle-specific ODO
3. GPS-derived trip distance
4. Manual calibration
```

Never invent an ODO value.

Display states clearly:

```text
Official ODO: N/A
Trip Distance: 68.2 km (GPS)
App Mileage: 12,846 km (Virtual/Estimated)
Confidence: HIGH
```

Use status/source values:

```text
ODO_KM_VERIFIED
DISTANCE_GPS
ODO_ESTIMATED
ODO_MANUAL
ODO_UNAVAILABLE
```

## 56. VIRTUAL ODOMETER LEDGER
Implement an application mileage ledger because factory ODO may be unavailable:

```text
Virtual Distance = validated trip distances + manual calibration offset
```

Fields:

```text
vehicle_id
trip_id
timestamp
distance_km
source
confidence
calibration_offset_km
created_at
```

Sources: `OBD`, `GPS`, `MANUAL`, `IMPORT`.

The UI MUST label this as **App Estimated Mileage / Virtual Odometer**, never as official Mazda odometer.

## 57. WEB TECHNOLOGY
Recommended:

```text
Next.js + TypeScript
Material UI / responsive UI
Apache ECharts or Recharts
Supabase Auth + PostgreSQL + Storage
Vercel (or equivalent hosting)
GitHub
```

Responsive for desktop, laptop, tablet and mobile browser. The 9-inch constraint applies to Android only.

## 58. WEB DASHBOARD
Show:

```text
Vehicles
Total Distance
Fuel Used
Average Consumption
Fuel Cost
Maintenance Cost
Parts Cost
Upgrade Cost
Insurance Cost
Loan Outstanding
Total Recorded Cost
Cost/km
Estimated Current Vehicle Value
```

Global filters: Vehicle, Year, Date Range.

Charts: monthly distance, consumption trend, fuel cost, maintenance, TCO, cost/km, utilization.

## 59. VEHICLE MANAGEMENT
Vehicle profile:

```text
Make, Model, Year, Trim, VIN, License Plate, Color,
Engine, Fuel Type, Tank Capacity, Purchase Date,
Purchase Price, Current ODO / Virtual ODO
```

Also: photos, documents, warranty, insurance, registration, inspection, notes, status (`ACTIVE`, `INACTIVE`, `SOLD`, `SERVICE`).

## 60. VEHICLE OPERATION WEB MODULE
Consume Android data:

```text
Current Fuel
Estimated Fuel Liters
Estimated Range
Average Consumption
Today's Distance
Monthly Distance
Last Trip
Last Seen
OBD Status
GPS Status
Cloud Sync Status
```

History: trips, daily/monthly mileage, consumption, GPS routes, diagnostics and telemetry. Never interpret missing ODO as zero mileage.

## 61. FUEL MANAGEMENT
Track:

```text
Date, Vehicle, Mileage, Liters, Price/L, Total Cost,
Station, Full/Partial, Notes
```

Analytics: L/100km, cost/km, monthly/yearly fuel cost, average fuel price, full-tank calibration history.

## 62. EXPENSE MANAGEMENT
General expense ledger:

```text
Fuel
Maintenance
Parts
Labor
Insurance
Registration
Inspection
Tax/Road Fee
Upgrade
Accessories
Cleaning
Parking
Toll
Repair
Other
```

Fields:

```text
vehicle_id, date, category, sub_category, amount, currency,
vendor, odometer_or_virtual_mileage, description, receipt_document
```

## 63. MAINTENANCE
Track oil, filters, plugs, brakes, tires, fluids, battery, transmission, AC, suspension and other work.

Each record:

```text
Date, Mileage, Part, Labor, Total Cost, Vendor, Notes,
Next Due Mileage, Next Due Date, Warranty
```

Statuses: `OVERDUE`, `DUE SOON`, `OK`.

## 64. PARTS
Track:

```text
Part Name, Part Number, Brand, Supplier, Purchase Date,
Installation Date, Cost, Warranty, Installed Mileage,
Replacement Mileage, Vehicle, Notes
```

## 65. UPGRADES / ACCESSORIES
Separate upgrades from maintenance.

Categories:

```text
Electronics, Safety, Performance, Comfort, Interior,
Exterior, Audio, Lighting, Wheels/Tires, Other
```

Track purchase/installation cost, date, mileage, vendor, warranty, notes and photos.

## 66. FINANCE / LOANS
Per vehicle, zero or more loans:

```text
vehicle_id
lender
loan_number_alias
principal
down_payment
interest_rate
term_months
start_date
monthly_payment
payment_day
current_balance
status
notes
```

Never store bank credentials.

Loan payments:

```text
Payment #
Due Date
Principal
Interest
Fees
Total Payment
Paid Date
Status
Remaining Balance
```

## 67. INSURANCE / REGISTRATION
Track mandatory insurance, comprehensive insurance, registration, road fee, inspection and warranty. Add expiry reminders.

## 68. DOCUMENTS
Use Supabase Storage for registration, insurance, purchase/loan contracts, invoices, warranty, inspection and other documents.

Link each document to:

```text
vehicle_id, document_type, document_date, expiry_date, storage_path
```

## 69. TOTAL COST OF OWNERSHIP
Calculate:

```text
Purchase
+ Loan Interest
+ Fuel
+ Maintenance
+ Parts
+ Upgrades
+ Insurance
+ Registration
+ Tax/Fees
+ Other Expenses
- Resale Proceeds
```

Show total, monthly/yearly cost and cost/km. If mileage is virtual, label it accordingly.

## 70. VEHICLE VALUE / DEPRECIATION
Allow manual current market value:

```text
Purchase Price
Estimated Current Value
Valuation Date
Source/Note
```

Calculate depreciation, depreciation %, depreciation/km. Do not claim automated market valuation without a verified data source.

## 71. REPORTS
Provide:

```text
Vehicle Monthly
Vehicle Annual
Family Fleet
Fuel
Maintenance
Expense
Loan
TCO
Mileage
```

Export CSV, Excel and PDF.

## 72. SHARED DATABASE EXTENSION
Add to the existing Supabase model:

```text
vehicle_documents
vehicle_images
expenses
parts
vehicle_parts
upgrades
loans
loan_payments
insurance_policies
registrations
vendors
vehicle_valuations
odometer_records
```

Every vehicle-specific table MUST contain `vehicle_id`.

## 73. DATA OWNERSHIP
Android primarily produces:

```text
OBD telemetry
Trips
GPS
Fuel telemetry
Trip-derived distance
Automatic summaries
OBD diagnostics
Device status
```

Web primarily manages:

```text
Vehicle master data
Expenses
Maintenance
Parts
Upgrades
Loans
Loan payments
Insurance
Registration
Documents
Manual corrections
Valuation
```

Both may read shared data. Manual corrections must be auditable.

## 74. DATA SOURCE / CONFIDENCE
Important calculated values must retain source and status:

```text
distance_source: OBD | GPS | MANUAL | IMPORT
value_status: VERIFIED | ESTIMATED | CALIBRATED | UNAVAILABLE
```

This is mandatory for Mazda2 Base because factory ODO may not be available.

## 75. ANDROID APP REMAINS FULL FEATURED
Adding the Web App MUST NOT remove any previously specified Android function.

Android still requires:

```text
Bluetooth OBD
ELM327 initialization
PID discovery
Live telemetry
Raw OBD logging
Automatic trip detection
Distance calculation
Fuel level
Fuel consumption
Fuel-rate integration
Estimated fuel remaining
Estimated driving range
GPS
Virtual odometer
Manual calibration
Refueling
Fuel calibration
Daily/weekly/monthly/yearly statistics
Maintenance
Diagnostics
Offline Room DB
Cloud sync
Google Sheets
Backup/restore
Multi-vehicle
Device-to-vehicle mapping
Auto reconnect
ZESTECH reboot recovery
```

It must remain useful as a standalone in-car logger even if Web is unavailable.

## 76. WEB VEHICLE LIST
Example:

```text
Vehicle  Mileage       Fuel   L/100km  Cost/km  Status
Mazda2    12,846 km     54%     6.9     3,670 ₫   ●
Mazda3    28,214 km     42%     7.2     4,020 ₫   ●
CX-5      41,128 km     68%     8.1     4,850 ₫   ●
```

Click a vehicle to open its complete workspace.

## 77. WEB NAVIGATION
```text
Dashboard
Vehicles
  └── Vehicle Detail
      ├── Overview
      ├── Operation
      ├── Trips
      ├── Fuel
      ├── Maintenance
      ├── Parts
      ├── Upgrades
      ├── Expenses
      ├── Finance
      ├── Insurance
      ├── Documents
      └── Analytics
Reports
Settings
```

## 78. GITHUB MONOREPO
```text
family-mobility-management/
├── android/MazdaCarLogger/
├── web/family-mobility-web/
├── supabase/migrations/
├── supabase/functions/
├── supabase/seed/
├── docs/
└── README.md
```

Android, Web and Supabase migrations share one repository but deploy independently.

## 79. WEB SECURITY
Use Supabase Auth, RLS, HTTPS, secure sessions and fleet/vehicle authorization. Never expose service-role key, database password, Google private key or server secrets.

## 80. WEB ACCEPTANCE
```text
[ ] Login
[ ] Dashboard
[ ] Multi-vehicle
[ ] Vehicle profile
[ ] Android telemetry visible
[ ] Trips
[ ] Fuel
[ ] Consumption
[ ] Virtual mileage
[ ] ODO unavailable handled correctly
[ ] Maintenance
[ ] Parts
[ ] Upgrades
[ ] Expenses
[ ] Loans
[ ] Loan payments
[ ] Insurance
[ ] Registration
[ ] Documents
[ ] TCO
[ ] Cost/km
[ ] Reports
[ ] RLS
[ ] Responsive UI
[ ] GitHub deployment
```

## 81. FINAL SYSTEM ARCHITECTURE
```text
                         GITHUB
                            │
             ┌──────────────┼──────────────┐
             │              │              │
          ANDROID          WEB          SUPABASE
             │              │           MIGRATIONS
             └──────────────┼──────────────┘
                            │
                            ▼
                    SUPABASE POSTGRES
                            │
          ┌─────────────────┼──────────────────┐
          │                 │                  │
       VEHICLES          FINANCE           OPERATION
       Expenses            Loans              Trips
       Parts               Payments           Fuel
       Upgrades            Insurance          Telemetry
       Documents           Registration       GPS
       Maintenance         Valuation           OBD
                            │
                     FAMILY DASHBOARD
```

## 82. FINAL IMPLEMENTATION PRINCIPLE
The project is one Family Mobility Management System.

The Android application is the in-car operational data acquisition and live monitoring module.

The Web Application is the central family vehicle management, finance, cost, maintenance and analytics module.

Both use the same Supabase database and common `vehicle_id`.

For Mazda2 Base:

```text
Verified ODO when available
        ↓
Vehicle-specific ODO when verified
        ↓
GPS trip distance
        ↓
Virtual Odometer Ledger
        ↓
Manual calibration
```

All values retain source and confidence. Do not fabricate missing ODO data. Do not remove Android features because the Web App exists. Do not create separate databases per vehicle.


# SUPABASE PROJECT CONFIGURATION — CURRENT PROJECT

The Supabase project has already been created and MUST be used as the central backend.

```text
Project Name:
MazdaCarLogger

Project Reference:
opslebsdmwsnsyfmbynf

Project URL:
https://opslebsdmwsnsyfmbynf.supabase.co
```

## Client Configuration

```text
SUPABASE_URL=https://opslebsdmwsnsyfmbynf.supabase.co
SUPABASE_PUBLISHABLE_KEY=<provided publishable key>
```

Security requirements:
- Use the Publishable Key only as client configuration with Supabase RLS enabled.
- NEVER put the PostgreSQL password in the Android APK.
- NEVER put the `service_role`/secret key in the Android APK.
- NEVER commit database passwords or secret keys to GitHub.
- Store local secrets through `local.properties`, environment variables, or another secure build configuration.
- Never print credentials in logs.

## Supabase CLI

Project reference:

```text
opslebsdmwsnsyfmbynf
```

```bash
supabase login
supabase init
supabase link --project-ref opslebsdmwsnsyfmbynf
```

The direct PostgreSQL connection is for secure administration/migrations only:

```text
postgresql://postgres:[YOUR-PASSWORD]@db.opslebsdmwsnsyfmbynf.supabase.co:5432/postgres
```

Replace `[YOUR-PASSWORD]` only locally when required. Never commit it.

## Required Database

Antigravity MUST create the schema in this existing Supabase project:

```text
profiles
fleets
vehicles
devices
trips
telemetry_samples
fuel_logs
daily_summaries
monthly_summaries
maintenance_logs
sync_queue
obd_profiles
```

Every vehicle-specific table MUST contain `vehicle_id`.

## Migration Structure

```text
supabase/
├── config.toml
├── migrations/
│   ├── 0001_initial_schema.sql
│   ├── 0002_indexes.sql
│   ├── 0003_rls_policies.sql
│   ├── 0004_functions_triggers.sql
│   └── 0005_seed_initial_vehicle.sql
└── README.md
```

The schema must be reproducible from GitHub using migrations.

## Required Indexes

```text
vehicles(fleet_id)
devices(vehicle_id)
trips(vehicle_id, start_time)
telemetry_samples(vehicle_id, timestamp)
telemetry_samples(trip_id, timestamp)
fuel_logs(vehicle_id, timestamp)
daily_summaries(vehicle_id, date)
monthly_summaries(vehicle_id, year, month)
maintenance_logs(vehicle_id, date)
sync_queue(vehicle_id, status)
```

## Row Level Security

Enable RLS on all user-accessible tables.

Security hierarchy:

```text
Authenticated User
       ↓
User Profile
       ↓
Fleet Membership / Ownership
       ↓
Vehicle
       ├── Trips
       ├── Fuel
       ├── Telemetry
       └── Maintenance
```

A user may only read/write authorized fleet and vehicle data. Android-side filtering is NOT sufficient security.

## Android Integration

Use:

```text
BuildConfig.SUPABASE_URL
BuildConfig.SUPABASE_PUBLISHABLE_KEY
```

or an equivalent secure build configuration.

Never hard-code database passwords, service-role keys, or secret keys.

## Sync

```text
Room SQLite
    ↓
Sync Queue
    ↓
Supabase
```

Use UUIDs, upsert, unique constraints, transaction-safe operations, retry, sync status, last-sync timestamp and error logging.

Cloud sync must be idempotent and duplicate-safe.

## Verification

```text
[ ] Existing project used
[ ] Database reachable
[ ] Tables created
[ ] Foreign keys created
[ ] Indexes created
[ ] RLS enabled
[ ] RLS policies tested
[ ] Authentication configured
[ ] Publishable key works
[ ] Test vehicle created
[ ] Test trip works
[ ] Test fuel record works
[ ] Vehicle isolation verified
[ ] Multi-vehicle queries verified
```

## GitHub Secret Rules

Never commit:

```text
DATABASE_PASSWORD
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_SECRET_KEY
GOOGLE_PRIVATE_KEY
GOOGLE_CLIENT_SECRET
```

Recommended `.gitignore`:

```text
local.properties
.env
.env.*
```

## Mandatory Antigravity Instruction

> Use the already-created Supabase project `opslebsdmwsnsyfmbynf` as the backend for MazdaCarLogger. Do not create another Supabase project. Implement the complete PostgreSQL schema, indexes, foreign keys, RLS policies, migrations, and Android integration according to this specification. Use `https://opslebsdmwsnsyfmbynf.supabase.co` as the project URL and configure the supplied Publishable Key through secure build configuration. Never embed database passwords, service-role keys, secret keys, or Google private credentials in the APK or Git repository.


## 53. SUCCESS CRITERIA
The same application can be installed on multiple ZESTECH devices/vehicles and all vehicles send data into one central Supabase database while:
- each vehicle is isolated by vehicle_id
- dashboard switches between vehicles
- fleet statistics aggregate vehicles
- each vehicle operates offline
- data syncs automatically after connectivity returns
- fuel consumption and range use real vehicle data
- Google Sheets receives structured reports
- ZESTECH reboot and temporary OBD/network failures do not lose data

Primary goal: reliable real-world vehicle telemetry and historical data collection, not merely a visual dashboard.



# FINAL ARCHITECTURE — MULTI-ASSET MOBILITY MODEL

## 83. SCOPE — ALL FAMILY MOBILITY ASSETS

The system MUST support more than cars.

Supported asset types:

```text
CAR
MOTORCYCLE
MOTORBIKE
BICYCLE
E_BIKE
SCOOTER
OTHER
```

Examples:

```text
Mazda2 Base 2026       → CAR
BMW S1000RR            → MOTORCYCLE
Yamaha scooter         → MOTORBIKE
Road Bike              → BICYCLE
Electric Road Bike     → E_BIKE
```

The database MUST NOT be designed around automotive-only assumptions.

## 84. CORE ENTITY — ASSET

Rename the core concept from `vehicle` to `asset`.

Primary table:

```text
assets
```

Core fields:

```text
id
owner_id
asset_type
category
subcategory
brand
model
year
color
serial_number
vin
license_plate
purchase_date
purchase_price
current_value
status
description
image_url
created_at
updated_at
```

Optional fields must be capability-dependent.

Examples:

```text
VIN / license_plate → cars and registered motorcycles
serial_number       → bicycles / e-bikes
fuel_tank_capacity  → cars / motorcycles
battery_capacity    → EV / e-bike
engine_cc           → motorcycles
```

Do NOT force every field onto every asset.

## 85. CAPABILITY-BASED DESIGN

Each asset can expose different capabilities:

```text
MILEAGE
GPS
FUEL
OBD
ENGINE
BATTERY
RIDE
MAINTENANCE
PARTS
UPGRADES
FINANCE
INSURANCE
DOCUMENTS
```

Example:

```text
Mazda2
  MILEAGE ✓
  GPS ✓
  FUEL ✓
  OBD ✓
  ENGINE ✓
  BATTERY ✓
  RIDE ✓
  MAINTENANCE ✓
  PARTS ✓
  UPGRADES ✓
  FINANCE ✓
  INSURANCE ✓

Road Bike
  MILEAGE ✓
  GPS ✓
  FUEL ✗
  OBD ✗
  ENGINE ✗
  BATTERY ✗
  RIDE ✓
  MAINTENANCE ✓
  PARTS ✓
  UPGRADES ✓
  FINANCE optional
  INSURANCE optional
```

The UI MUST only display modules relevant to the selected asset.

## 86. ASSET-SPECIFIC OPERATION

### Cars / Motorcycles

Support:

```text
Mileage
Fuel
Fuel Consumption
Fuel Cost
GPS
Trips
OBD
Diagnostics
Engine Data
Maintenance
```

### Bicycles

Support:

```text
Ride Distance
Ride Time
Average Speed
Max Speed
Elevation Gain
Cadence
Heart Rate
Power
Calories
GPS Route
Component Mileage
```

### E-Bikes

Support:

```text
Ride Distance
Battery %
Battery Wh
Estimated Range
Charging
Charge Cycles
Battery Health
GPS
Ride Statistics
```

## 87. DASHBOARD — FAMILY MOBILITY HOME

The Web App home dashboard MUST visually present the family's assets using **image-based cards**.

Layout:

```text
FAMILY MOBILITY
──────────────────────────────────────────────

[ + Add Asset ]        [ Filter ] [ Settings ]

┌────────────────────┐  ┌────────────────────┐
│                    │  │                    │
│    VEHICLE PHOTO   │  │    BIKE PHOTO      │
│                    │  │                    │
├────────────────────┤  ├────────────────────┤
│ Mazda2 Base 2026   │  │ Road Bike          │
│ 🚗 CAR             │  │ 🚴 BICYCLE         │
│                    │  │                    │
│ 520M ₫             │  │ 85M ₫              │
│ 30A-123.45         │  │ 2,842 km           │
│ 12,846 km           │  │ 42 rides           │
│ 6.9 L/100km        │  │ 29.6 km/h          │
│                    │  │                    │
│ ● Active           │  │ ● Active           │
└────────────────────┘  └────────────────────┘
```

Cards MUST use the asset's representative image as the visual anchor.

If no image exists, show a clean asset-type placeholder.

## 88. DASHBOARD CARD CONFIGURATION

The user MUST be able to configure which fields appear on asset cards.

Path:

```text
Settings
└── Dashboard
    └── Asset Card Display
```

Configurable fields:

```text
Asset Photo
Asset Name
Asset Type
Brand / Model
Purchase Price
License Plate
VIN
Serial Number
Current Mileage
Virtual Mileage
Fuel Level
Fuel Consumption
Estimated Range
Current Value
Loan Balance
Maintenance Due
Insurance Expiry
Last Trip
Last Ride
Battery Level
Battery Range
Status
Custom Fields
```

Each field has:

```text
Visible: ON / OFF
Order: drag & drop
Label: customizable
```

Example:

```text
DISPLAY SETTINGS — CAR

☑ Photo
☑ Asset Name
☑ Purchase Price
☑ License Plate
☑ Current Mileage
☑ Fuel Consumption
☐ VIN
☐ Loan Balance
☑ Maintenance Due
☐ Insurance Expiry
```

Different asset types can have different default display configurations.

## 89. DASHBOARD CARD DISPLAY RULES

The system MUST intelligently hide unsupported fields.

Example:

```text
CAR
→ Fuel Level shown

BICYCLE
→ Fuel Level automatically hidden

E-BIKE
→ Battery Level shown

MOTORCYCLE
→ Fuel Level shown

ROAD BIKE
→ Ride Distance shown
```

The user may override visibility where the capability exists.

Unsupported fields cannot be displayed as fake zero values.

## 90. ASSET CARD CLICK BEHAVIOR

Clicking/tapping an asset card opens:

```text
/assets/{asset_id}
```

or equivalent route.

This opens the complete **Asset Detail Workspace**.

## 91. ASSET DETAIL PAGE

Header:

```text
┌────────────────────────────────────────────────────┐
│ [PHOTO]  Mazda2 Base 2026                         │
│          🚗 CAR                                    │
│          30A-123.45                                │
│                                                    │
│          [Edit] [Add Expense] [Add Maintenance]   │
└────────────────────────────────────────────────────┘
```

Below the header:

```text
Overview
Operation
Trips / Rides
Fuel / Battery
Maintenance
Parts
Upgrades
Expenses
Finance
Insurance
Documents
Analytics
```

Only relevant tabs are shown.

## 92. ASSET DETAIL — OVERVIEW

Show:

```text
Purchase Price
Purchase Date
Current Value
Mileage
Status
Total Cost
Cost/km
Maintenance Status
Finance Status
Insurance Status
```

For bicycles:

```text
Purchase Price
Purchase Date
Current Value
Total Distance
Total Rides
Component Status
Total Cost
Cost/km
```

## 93. ASSET DETAIL — OPERATION

For Mazda2:

```text
Current Fuel
Fuel %
Estimated Liters
Estimated Range
Average Consumption
Today's Distance
Monthly Distance
Last Trip
OBD Status
GPS Status
```

For motorcycle:

```text
Fuel
Range
Mileage
Trips
Engine/OBD where available
```

For bicycle:

```text
Today's Ride
Monthly Distance
Total Distance
Average Speed
Elevation
Ride Time
```

For e-bike:

```text
Battery %
Range
Charging History
Ride Distance
Battery Health
```

## 94. DASHBOARD SETTINGS

Settings MUST include:

```text
Dashboard
├── Asset Card Layout
├── Card Fields
├── Field Order
├── Default Sort
├── Default Filter
├── Units
├── Currency
└── Compact / Comfortable View
```

Default sort options:

```text
Name
Asset Type
Purchase Date
Purchase Price
Current Value
Mileage
Last Activity
Status
```

Default layout:

```text
Grid
List
Compact Grid
```

## 95. FAMILY DASHBOARD SUMMARY

Above or beside the asset cards, show configurable summary cards:

```text
Total Assets
Cars
Motorcycles
Bicycles
E-Bikes

Total Purchase Value
Current Estimated Value
Total Recorded Expenses
Total Maintenance
Total Fuel Cost
Total Upgrade Cost
Outstanding Loans
Total Distance
```

The user may configure which summary cards are visible.

## 96. ASSET GROUPING

Support:

```text
All Assets
Cars
Motorcycles
Bicycles
E-Bikes
Other
```

Optional custom groups:

```text
Family
Personal
Work
Sport
Weekend
Travel
```

An asset may belong to one or more user-defined groups if required.

## 97. UNIVERSAL MAINTENANCE MODEL

Maintenance remains generic:

```text
asset_id
date
type
part
labor
cost
mileage
ride_distance
vendor
notes
next_due_date
next_due_mileage
next_due_distance
warranty
```

This allows:

```text
Mazda2 → Engine Oil
Motorcycle → Chain/Sprocket
Road Bike → Cassette
E-bike → Battery inspection
```

## 98. UNIVERSAL PARTS MODEL

```text
parts
asset_parts
```

A part can be:

```text
Engine Oil
Brake Pad
Chain
Cassette
Wheel
Tire
Battery
Derailleur
Handlebar
OBD Adapter
```

Track installation and replacement history against `asset_id`.

## 99. UNIVERSAL EXPENSE MODEL

All expenses use:

```text
asset_id
date
category
amount
currency
vendor
description
document
mileage_or_distance
```

Categories are configurable.

## 100. FINAL DATABASE CORE

Replace vehicle-centric core with:

```text
assets
asset_types
asset_categories
asset_capabilities
asset_groups
asset_documents
asset_images

trips
rides
mileage_records
telemetry_samples

fuel_logs
battery_logs
charging_logs

maintenance_records
parts
asset_parts

upgrades
expenses

loans
loan_payments

insurance_policies
registrations

vendors
asset_valuations

odometer_records
sync_queue
```

All operational tables use:

```text
asset_id
```

rather than `vehicle_id`.

## 101. ANDROID RELATIONSHIP

The Mazda2 Android app remains a specialized in-car module:

```text
Android OBD App
       │
       ▼
asset_id = Mazda2
       │
       ▼
Supabase
       │
       ▼
Web Asset Detail
       │
       ├── Live/Latest Telemetry
       ├── Trips
       ├── Fuel
       ├── Mileage
       ├── Diagnostics
       └── Analytics
```

The same architecture can later support a motorcycle Android/GPS app without redesigning the database.

## 102. FINAL PRODUCT NAME

Use:

**Family Mobility Management System (FMMS)**

Suggested repository:

```text
family-mobility-management
```

Suggested application structure:

```text
Family Mobility Management
├── Dashboard
├── Assets
├── Trips / Rides
├── Fuel / Battery
├── Maintenance
├── Parts
├── Upgrades
├── Expenses
├── Finance
├── Insurance
├── Documents
├── Analytics
└── Settings
```

## 103. FINAL ACCEPTANCE CRITERIA

```text
[ ] Cars supported
[ ] Motorcycles supported
[ ] Motorbikes supported
[ ] Bicycles supported
[ ] E-bikes supported
[ ] Generic asset model implemented
[ ] Capability-based UI implemented
[ ] Image asset cards implemented
[ ] Card fields configurable
[ ] Card field order configurable
[ ] Card visibility configurable
[ ] Unsupported fields automatically hidden
[ ] Asset card click opens detail page
[ ] Asset detail workspace implemented
[ ] Asset-specific operation modules implemented
[ ] Shared Supabase database
[ ] RLS by owner/family/group
[ ] Android OBD data linked by asset_id
[ ] Mazda2 virtual odometer retained
[ ] Full Android functionality retained
```


# AI PLATFORM & OMNICHANNEL ASSISTANT — ADDITIONAL REQUIREMENTS

## 104. AI AS AN EXTENSIBILITY LAYER

The system MUST support multiple AI providers without changing core Family Mobility business logic.

Target providers:
- OpenAI
- Google Gemini
- Anthropic Claude
- Open-source / self-hosted LLM
- Local LLM
- Future providers

Multiple providers may be configured simultaneously. The user can select a default provider and optionally route different tasks to different providers.

## 105. AI PROVIDER ABSTRACTION

Use a provider-independent AI layer:

```text
AIProvider
├── OpenAIProvider
├── GeminiProvider
├── ClaudeProvider
├── LocalLLMProvider
└── FutureProvider
```

Common capabilities may include:
- chat
- text generation
- structured output
- summary
- analysis
- report generation
- tool/function calling
- optional vision
- optional speech-to-text
- optional text-to-speech

Business logic MUST NOT depend directly on a single vendor.

## 106. AI SETTINGS

Provide:

```text
Settings
└── AI & Assistant
    ├── Providers
    ├── Default Provider
    ├── Model
    ├── Credentials
    ├── Language
    ├── Response Style
    ├── Data Access
    ├── Voice
    ├── Chat
    ├── Automation
    └── Privacy
```

Never commit AI credentials to GitHub or source code.

## 107. AI CONTEXT LAYER

AI MUST NOT blindly read the entire database.

```text
Raw Data
   ↓
Normalized Data
   ↓
Analytics Engine
   ↓
AI Context Builder
   ↓
AI Provider
   ↓
Answer / Report / Insight
```

The context builder can provide asset data, daily/monthly/yearly summaries, trips/rides, fuel, battery, maintenance, parts, upgrades, expenses, finance, insurance and authorized documents.

Prefer aggregated analytics over large raw telemetry datasets.

## 108. NATURAL-LANGUAGE AI CHAT

The assistant must understand questions such as:

```text
"Xe Mazda2 tháng này chạy bao nhiêu km?"
"Chi phí/km của Mazda2 tháng này?"
"So sánh tháng này với tháng trước."
"Xe nào trong gia đình tốn chi phí/km cao nhất?"
"Năm 2026 tôi đã chi bao nhiêu tiền cho tất cả phương tiện?"
"Bao giờ Mazda2 cần bảo dưỡng?"
"Tóm tắt tình hình sử dụng xe tháng này."
"Tạo báo cáo Family Mobility tháng 8."
"Road Bike đã chạy bao nhiêu km?"
"Component nào của xe đạp cần thay?"
```

The assistant should understand the current screen and current asset context.

## 109. GLOBAL FLOATING AI BUTTON

A global floating AI button MUST be available across major screens.

Requirements:
- floating above content
- draggable
- remembers preferred position
- safe-area aware
- must not block critical controls
- collapsible
- reset position from Settings

Example:

```text
┌─────────────────────────────────────┐
│             PAGE CONTENT             │
│                                     │
│                              ┌────┐ │
│                              │ ✨ │ │
│                              │ AI │ │
│                              └────┘ │
└─────────────────────────────────────┘
```

Pressing it opens the AI assistant.

## 110. AI CHAT POPUP / DRAWER

```text
┌─────────────────────────────────────┐
│ ✨ Family Mobility Assistant    ×  │
├─────────────────────────────────────┤
│ AI: Xin chào! Tôi có thể giúp gì?  │
│                                     │
│ User: Mazda2 tháng này chạy bao km?│
│ AI: 842 km...                       │
├─────────────────────────────────────┤
│ [ 🎤 ] Nhập tin nhắn...        [➤] │
└─────────────────────────────────────┘
```

Web: popup/side drawer.
Mobile: bottom sheet/expandable chat.
ZESTECH: automotive-friendly popup/side panel.

Conversation context is preserved during the active session.

## 111. VOICE INPUT

Support:
- text input
- voice input

Flow:

```text
🎤
 ↓
Speech-to-Text
 ↓
AI
 ↓
Response
```

Vietnamese should be supported first. Architecture must allow other languages later.

## 112. OPTIONAL VOICE OUTPUT

Support optional:

```text
AI Response
 ↓
Text-to-Speech
 ↓
Voice
```

Especially useful on ZESTECH.

Settings:

```text
Voice Assistant [ON/OFF]
Auto Speak       [ON/OFF]
Language         [Vietnamese]
Voice            [Default]
```

## 113. CURRENT SCREEN CONTEXT

When AI is opened, send contextual metadata when authorized:

```text
Current Screen: Asset Detail
Current Asset: Mazda2 Base 2026
Current Module: Fuel
Current Filter: August 2026
```

Therefore a question such as "Tại sao tháng này tiêu thụ xăng cao?" can be answered without repeating vehicle/date.

User must still be able to switch context.

## 114. CONTROLLED AI TOOLS

Support controlled function/tool calling.

Example:

```text
AI
 ↓
get_asset_summary()
 ↓
get_monthly_fuel()
 ↓
calculate_cost_per_km()
 ↓
AI answer
```

AI MUST NOT have unrestricted database write access.

Read tools may include:

```text
get_asset
get_asset_summary
get_distance_summary
get_fuel_summary
get_expense_summary
get_maintenance_summary
get_trip_summary
get_finance_summary
compare_assets
```

Write tools such as:

```text
create_expense
create_maintenance_record
create_fuel_log
create_note
```

MUST require explicit user confirmation before execution.

## 115. AI REPORT GENERATOR

Support:
- Vehicle Monthly Report
- Vehicle Yearly Report
- Family Monthly Report
- Family Yearly Report
- Fuel Efficiency Report
- Cost Analysis Report
- Maintenance Report
- Expense Report
- Mobility Summary

Flow:

```text
Scope → Period → AI Provider → Generate → Preview → Save/Export/Share
```

## 116. AI INSIGHTS & ANOMALY DETECTION

Optional AI insights include:

```text
Fuel consumption increased 10.4%.
Operating cost/km increased 8.2%.
Mileage is 24% higher than normal.
Maintenance spending is unusually high.
A component is approaching replacement interval.
```

Clearly distinguish:
- Measured
- Calculated
- Estimated
- AI Interpretation
- AI Recommendation

AI must not present an inference as a verified mechanical fault.

## 117. AUTOMATED AI SUMMARY

Allow scheduled:
- Daily
- Weekly
- Monthly
- Yearly

Example:

```text
Monthly Family Mobility Summary

Total distance: 2,842 km
Fuel: 186 L
Fuel cost: 5.1M ₫
Maintenance: 1.2M ₫
Operating cost/km: 2,216 ₫
```

AI adds natural-language interpretation.

## 118. MULTI-PROVIDER ROUTING

Allow task-based routing:

```text
General Chat        → Gemini
Long Report         → Claude
Structured Analysis → OpenAI
Private/Offline     → Local LLM
```

User can override routing.

If a provider is unavailable, an authorized fallback provider may be used and the fallback must be visible.

## 119. AI USAGE / COST CONTROL

Track:

```text
Provider
Model
Requests
Input tokens
Output tokens
Estimated cost
Date
Task
```

Optional:
- daily request limit
- monthly budget
- maximum tokens/request

## 120. AI PRIVACY

Provide configurable data access:

```text
☑ Asset information
☑ Mileage
☑ Trips
☑ Fuel
☑ Maintenance
☑ Expenses
☑ Finance
☐ Documents
☐ Raw OBD telemetry
```

Raw OBD telemetry should be excluded by default.

External AI access requires explicit authorization for protected data.

## 121. OMNICHANNEL AI

The same AI assistant architecture should support:

```text
Web App
Android App
ZESTECH
Zalo
Telegram
Future messaging platforms
```

```text
                    AI CORE
                       │
        ┌──────────────┼──────────────┐
        │              │              │
       Web          Android       Messaging
        │              │          ┌────┴────┐
     AI Button      ZESTECH      Zalo   Telegram
```

All channels use the same underlying user/asset context and AI service layer.

## 122. TELEGRAM

Reserve an integration for a Telegram bot.

Flow:

```text
Telegram
 ↓
Authentication / User Mapping
 ↓
AI Context
 ↓
AI Provider
 ↓
Response
```

Telegram identity must map to an authorized application user.

## 123. ZALO

Reserve an integration layer for Zalo.

Zalo-specific implementation must be isolated because platform/API requirements may change.

```text
Zalo
 ↓
Zalo Adapter
 ↓
Omnichannel Gateway
 ↓
AI Core
```

## 124. OMNICHANNEL IDENTITY

All channels must resolve to the same application user.

```text
Family Account
├── Web Account
├── Android Account
├── Telegram Identity
└── Zalo Identity
```

External accounts must be explicitly linked/authorized.

## 125. CONVERSATION MEMORY

Support:

```text
Session Memory
User Preferences
Asset Context
Conversation History
Saved AI Notes
```

Provide controls to clear conversation history and saved AI context.

## 126. AI ENTRY POINTS

AI can be opened from:

```text
Global floating button
Dashboard
Asset Detail
Trip Detail
Fuel
Maintenance
Expenses
Finance
Analytics
Reports
Settings
```

Context adapts to the originating page.

Examples:

```text
Maintenance → "Bao giờ cần bảo dưỡng?"
Fuel        → "Tại sao tiêu thụ tăng?"
Expenses    → "Chi phí tháng này tăng vì đâu?"
Analytics   → "Phân tích xu hướng."
Asset Detail→ "Tóm tắt xe này."
Dashboard   → "Tóm tắt toàn bộ gia đình."
```

## 127. AI CENTER

Provide:

```text
AI CENTER
├── Ask AI
├── Recent Conversations
├── Saved Reports
├── AI Insights
├── Providers
├── Usage
└── Automations
```

## 128. AI AUTOMATION

Future automation rules:

```text
WHEN monthly summary generated
THEN generate AI report
AND send to Telegram
AND save report
```

or:

```text
WHEN maintenance due within 500 km
THEN generate reminder
```

Automation must be configurable and disableable.

## 129. AI ACCEPTANCE CRITERIA

```text
[ ] Multiple AI providers supported
[ ] Provider abstraction implemented
[ ] Provider configuration screen
[ ] Default provider configurable
[ ] Task-based provider routing
[ ] AI context layer
[ ] AI reads analytics
[ ] Asset-level questions
[ ] Family-level questions
[ ] Current screen context
[ ] Global floating AI button
[ ] Draggable AI button
[ ] Saved button position
[ ] Chat popup/drawer
[ ] Text input
[ ] Voice input architecture
[ ] Optional text-to-speech
[ ] ZESTECH AI entry point
[ ] Telegram integration architecture
[ ] Zalo integration architecture
[ ] Omnichannel identity mapping
[ ] Conversation memory
[ ] AI report generation
[ ] AI insights
[ ] AI anomaly detection
[ ] Controlled tool/function calling
[ ] Confirmation for write actions
[ ] AI usage tracking
[ ] AI privacy/data access controls
[ ] Provider fallback
[ ] AI automation architecture
```

## 130. FINAL AI ARCHITECTURAL PRINCIPLE

```text
                 FAMILY MOBILITY CORE
                         │
              ┌──────────┴──────────┐
              │                     │
         DATA/ANALYTICS          AI CORE
              │                     │
              │              ┌──────┼──────┐
              │              │      │      │
              │           Context Tools Memory
              │              │
              │        AI PROVIDER LAYER
              │        ┌─────┼─────┬─────┐
              │        │     │     │     │
              │      OpenAI Gemini Claude Local
              │
              └──────────┬──────────────┘
                         │
                 OMNICHANNEL GATEWAY
                         │
          ┌──────────────┼──────────────┐
          │              │              │
         Web          Android       Messaging
          │              │          ┌────┴────┐
       AI Button      ZESTECH      Zalo   Telegram
```

The AI layer MUST remain replaceable.

The core mobility management system MUST continue working if all AI providers are disconnected.

AI is an enhancement layer, not a dependency for core asset management.


# CLOUD, SOURCE CODE & FREE-TIER DEPLOYMENT REQUIREMENTS

## 131. DEPLOYMENT OBJECTIVE

FMMS MUST be deployable online with minimal/zero infrastructure cost for personal/family use, while retaining a clear upgrade path.

```text
GitHub → Vercel → Supabase
              ↑
Android → ZESTECH → OBD
```

No always-on VPS is required initially.

## 132. GITHUB AS SOURCE CONTROL

Repository:

```text
https://github.com/sonsmartsoft/FMMS
```

Recommended structure:

```text
FMMS/
├── web/
├── android/
├── shared/
├── supabase/
├── docs/
├── scripts/
└── README.md
```

GitHub stores source code, documentation, migrations and Android source.

NEVER commit:

```text
Supabase passwords
AI API keys
Telegram/Zalo tokens
OAuth secrets
Production secrets
Private user data
Telemetry database dumps
Personal documents
```

Use environment variables and platform secret managers.

## 133. WEB HOSTING

Web App SHOULD deploy through Vercel or equivalent serverless/static hosting.

```text
git push
  ↓
GitHub
  ↓
CI/CD
  ↓
Vercel
  ↓
Production
```

Support Development, Preview and Production environments.

The Web App MUST NOT depend on the developer's computer being online.

## 134. SUPABASE AS CENTRAL BACKEND

Supabase is the central managed backend for:

```text
PostgreSQL
Authentication
Storage
Realtime
Edge Functions
Database migrations
Row Level Security
```

Project:

```text
FMMS
Project Ref: opslebsdmwsnsyfmbynf
Project URL: https://opslebsdmwsnsyfmbynf.supabase.co
```

Credentials MUST be supplied securely. Publishable/client keys may be used where appropriate; service-role keys MUST remain server-side.

## 135. SUPABASE STORAGE

Use Storage for:

```text
Asset photos
Receipts
Invoices
Registration/insurance documents
Maintenance photos
Other attachments
```

Store metadata/path in PostgreSQL rather than unnecessarily storing binary files in database tables.

## 136. AUTHORIZATION

Use centralized authentication and Row Level Security.

```text
User → Family/Household → Asset → Authorized Data
```

Telegram/Zalo identities must be explicitly linked to an authorized user.

## 137. SERVERLESS BACKEND

Privileged operations SHOULD use serverless/Edge Functions:

```text
AI Gateway
Telegram Webhook
Zalo Adapter
Scheduled Reports
Secure Writes
External API Proxy
Data Aggregation
```

No privileged credentials in the frontend.

## 138. ANDROID SOURCE

Android source SHOULD remain in the same GitHub repository:

```text
android/
├── app/
├── obd/
├── gps/
├── telemetry/
├── local_database/
├── sync/
├── ui/
└── tests/
```

It remains responsible for OBD Bluetooth, GPS, trip detection, virtual odometer, fuel calculations, offline collection and cloud sync.

## 139. ANDROID RELEASE ARTIFACTS

APK/AAB builds SHOULD use GitHub Releases or artifact storage rather than repeatedly committing binaries into the repository.

## 140. SHARED DATA CONTRACTS

Web and Android SHOULD share/version common contracts:

```text
Asset
Trip
Ride
Telemetry
FuelLog
MileageRecord
Maintenance
Expense
AIContext
```

Database migrations and API contracts MUST be version controlled.

## 141. ENVIRONMENTS

Support:

```text
Development
Preview/Staging
Production
```

Conceptual variables:

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
AI_PROVIDER_*
AI_API_KEY_*
TELEGRAM_*
ZALO_*
```

Secrets MUST never be hard-coded.

## 142. FREE-TIER-FIRST

Initial deployment SHOULD target free tiers:

```text
GitHub     → Free
Web        → Vercel Hobby/equivalent
Backend    → Supabase Free
Android    → No server required
```

No dedicated VPS is required initially.

AI API usage is separate and may incur provider charges.

## 143. TELEMETRY QUOTA MANAGEMENT

Do not store unlimited high-frequency raw OBD telemetry forever by default.

Use:

```text
RAW TELEMETRY
      ↓
TRIP DATA
      ↓
DAILY SUMMARY
      ↓
MONTHLY SUMMARY
      ↓
YEARLY SUMMARY
```

Support configurable raw retention such as 7/30/90 days.

Trip and summary data should be retained long-term.

## 144. ANALYTICS LAYER

Create analytics aggregates at:

```text
Trip
Day
Month
Year
Lifetime
```

Metrics include:

```text
Distance
Trip/Ride count
Fuel
Fuel cost
Average consumption
Operating cost
Operating cost/km
Maintenance
Parts
Upgrades
Total expense
```

For bicycles/e-bikes also support ride time, speed, elevation, battery and component distance.

## 145. AI DEPLOYMENT

AI API keys MUST remain server-side.

```text
Web / Android / Telegram / Zalo
              ↓
         AI Gateway
              ↓
       AI Context Builder
              ↓
       Provider Router
       ┌──────┼──────┐
     Gemini OpenAI Claude
              │
          Local LLM
```

The AI Gateway SHOULD run as a secure serverless/Edge Function.

## 146. BACKUP

GitHub is NOT a database backup.

```text
Source       → GitHub
Database     → Supabase backup/export strategy
Files        → Supabase Storage + optional external backup
Secrets      → Secure secret manager
```

Document database export/restore procedures.

## 147. DISASTER RECOVERY

Document recovery for:

```text
Web hosting failure
Supabase failure
Database corruption
Accidental deletion
Lost Android device
Lost developer machine
Lost AI credentials
```

Source must always be recoverable from GitHub.

## 148. MONITORING

Provide basic monitoring/logging for:

```text
Web deployments
API/serverless errors
Database errors
Android sync failures
AI provider failures
Telegram/Zalo webhooks
Storage failures
```

Never log secrets or unnecessary sensitive data.

## 149. DEPLOYMENT ACCEPTANCE CRITERIA

```text
[ ] GitHub is source-of-truth
[ ] Web deploys from GitHub
[ ] Automatic deployment configured
[ ] Dev/Preview/Production separated
[ ] Supabase central database
[ ] Storage configured
[ ] Auth configured
[ ] RLS configured
[ ] Service-role secrets server-side
[ ] AI keys server-side
[ ] Serverless privileged operations
[ ] Android source in GitHub
[ ] APK/AAB handled as releases/artifacts
[ ] Migrations version controlled
[ ] Shared contracts version controlled
[ ] Free-tier-first deployment
[ ] No VPS required initially
[ ] Telemetry retention implemented
[ ] Analytics aggregation implemented
[ ] AI Gateway implemented
[ ] Backup strategy documented
[ ] Disaster recovery documented
[ ] Basic monitoring implemented
```

## 150. FINAL DEPLOYMENT PRINCIPLE

```text
GitHub      = SOURCE CODE
Vercel      = WEB HOSTING
Supabase    = DATABASE + AUTH + STORAGE + BACKEND
Android     = ON-VEHICLE DATA COLLECTION
ZESTECH     = IN-CAR DISPLAY
OBD         = VEHICLE DATA SOURCE
AI Gateway  = MULTI-AI ABSTRACTION
Telegram/Zalo = FUTURE OMNICHANNEL
```

FMMS MUST work without an always-on VPS initially and remain portable to paid/self-hosted infrastructure later.


# ODOMETER, DISTANCE & CALIBRATION REQUIREMENTS

## 153. ODOMETER/DISTANCE PRINCIPLE

FMMS MUST NOT assume every existing vehicle starts at `0 km`.

Each asset MUST support an initial distance/odometer value when registered.

Normalized internal concept:

```text
total_distance_km
```

UI labels adapt by asset type:

```text
Car/Motorcycle/Motorbike → Odometer
Bicycle/E-bike            → Total Distance
```

## 154. INITIAL ODO / DISTANCE

Asset creation MUST support:

```text
Initial ODO / Distance
Initial ODO / Distance Date
Initial ODO / Distance Source
```

Example:

```text
Mazda2 Base 2026
Initial ODO: 35,280 km
Date: 15/08/2026
Source: Dashboard / Manual Verification
```

An existing vehicle MUST NOT be reset to 0 km merely because FMMS has no previous telemetry.

## 155. DISTANCE SOURCES

Support:

```text
OBD
GPS
Manual
Virtual
Imported
```

Distance records SHOULD contain:

```text
asset_id
source
distance
timestamp
trip_id (optional)
device_id (optional)
confidence/status
```

## 156. PRIMARY DISTANCE SOURCE

Each asset MUST allow:

```text
○ OBD
○ GPS
○ Manual
● Virtual
```

If OBD does not expose reliable ODO, use Virtual ODO with GPS/OBD trip distance as supporting data.

If reliable OBD ODO becomes available, OBD can become primary.

## 157. VIRTUAL ODOMETER

Android MUST support a Virtual Odometer where vehicle ODO is unavailable.

```text
Initial ODO + verified trip distance = Virtual ODO
```

Example:

```text
35,280 + 42 + 18 + 65 = 35,405 km
```

Virtual ODO MUST survive app/device restarts and be synchronized to Supabase.

## 158. OBD ODO COMPARISON

When available, compare:

```text
Dashboard ODO
OBD ODO
Virtual ODO
```

Example:

```text
Dashboard  35,680 km
OBD        35,679 km
Virtual    35,680 km
```

Show status:

```text
Matched
Small Difference
Needs Calibration
```

Thresholds are configurable.

## 159. ODO CALIBRATION

FMMS MUST support calibration without deleting history.

Example:

```text
Current FMMS ODO: 35,405 km
Actual dashboard: 35,685 km
Adjustment: +280 km
New FMMS ODO: 35,685 km
```

Create an adjustment event rather than overwriting previous records.

## 160. ODO ADJUSTMENT AUDIT

Every correction MUST create an audit record:

```text
Previous ODO
Adjustment
New ODO
Reason
Source
User
Timestamp
```

Conceptual table:

```text
odometer_adjustments
├── id
├── asset_id
├── previous_value
├── adjustment_value
├── new_value
├── reason
├── source
├── created_by
└── created_at
```

Normal UI MUST NOT hard-delete adjustment history.

## 161. INITIAL ODO CORRECTION

Provide:

```text
Correct Initial ODO
```

Example:

```text
Original: 35,000 km
Correct: 35,280 km
Reason: Actual dashboard reading at FMMS onboarding
```

Preserve the original value in audit history and keep existing trip records intact.

## 162. ODO VALIDATION

Detect:

```text
Current ODO < previous ODO
Abnormally large trip
OBD ODO differs significantly from Virtual ODO
```

Show:

```text
⚠ ODO inconsistency detected
```

Abnormal corrections should require user confirmation.

## 163. DAILY / MONTHLY / YEARLY DISTANCE

Calculate:

```text
Today
This Week
This Month
This Year
Lifetime
```

Example:

```text
Mazda2
Today: 42 km
August: 684 km
2026: 8,425 km
Lifetime: 35,685 km
```

The same model supports cars, motorcycles, motorbikes, bicycles and e-bikes.

## 164. COST PER KM

Distance MUST integrate with expense analytics.

Support:

```text
Fuel-only cost/km
Running cost/km
Maintenance cost/km
Total ownership cost/km
```

The report MUST clearly show the selected scope.

## 165. MAINTENANCE ODO INTEGRATION

Maintenance MUST support distance and time intervals:

```text
Every 10,000 km OR 12 months
```

Whichever condition occurs first can trigger the reminder.

Example:

```text
Current: 35,685 km
Next service: 40,000 km
Remaining: 4,315 km
```

## 166. COMPONENT DISTANCE

Components SHOULD have independent distance counters.

Example:

```text
Road Bike
Total: 8,245 km
Chain: 2,800 km since replacement
Brake Pads: 1,950 km
Tyres: 3,200 km
```

Component replacement resets only that component counter, not asset lifetime distance.

## 167. DISTANCE DATA MODEL

Separate:

```text
Asset Total Distance
Trip/Ride Distance
Daily Aggregation
Monthly Aggregation
Yearly Aggregation
ODO Adjustments
Component Distance
```

## 168. DASHBOARD DISPLAY

Asset cards SHOULD support configurable display of:

```text
Current ODO
Today's Distance
Monthly Distance
Yearly Distance
Cost/km
```

Example:

```text
┌─────────────────────────────┐
│ Mazda2 Base 2026            │
│ 35,685 km                   │
│ Today       42 km           │
│ This month  684 km          │
│ Cost/km   2,558 ₫            │
└─────────────────────────────┘
```

## 169. ODO HISTORY

Each asset SHOULD provide an ODO History screen:

```text
Date
Value
Source
Type
Difference
User
```

Example:

```text
15 Aug  35,685 km  Manual   Adjustment
14 Aug  35,405 km  Virtual  Calculated
13 Aug  35,340 km  Virtual  Calculated
```

## 170. MANUAL ODO ENTRY

Support manual readings:

```text
Current dashboard: [35,685] km
Source: Dashboard
Photo: Optional
Note: Verified during service
```

## 171. ODO PHOTO EVIDENCE

Support attaching:

```text
Dashboard ODO photo
Service invoice
Maintenance document
```

Store files in Supabase Storage and metadata in PostgreSQL.

## 172. ODO SYNCHRONIZATION

Android:

```text
Local trip/ODO records
        ↓
Validation
        ↓
Supabase
        ↓
Aggregation
        ↓
Current Asset Distance
```

Sync MUST be idempotent and prevent duplicate trips/distance.

## 173. OFFLINE OPERATION

Android MUST collect distance offline.

Persist locally:

```text
Last Known ODO
Current Virtual ODO
Pending Trips
Pending ODO Events
Last Sync
```

Sync automatically when connectivity returns.

## 174. ODO ACCEPTANCE CRITERIA

```text
[ ] Initial ODO can be entered
[ ] Initial ODO date/source supported
[ ] Existing vehicles do not default to 0 km
[ ] OBD/GPS/Manual/Virtual distance supported
[ ] Primary distance source configurable
[ ] OBD vs Virtual comparison
[ ] ODO calibration
[ ] Correction preserves history
[ ] Adjustment reason/user/time recorded
[ ] Initial ODO correction
[ ] ODO anomaly detection
[ ] Daily/monthly/yearly/lifetime distance
[ ] Cost/km
[ ] Maintenance by km and time
[ ] Component distance
[ ] ODO history
[ ] Manual ODO entry
[ ] Dashboard photo evidence
[ ] Offline collection
[ ] Idempotent synchronization
```

## 175. DATA INTEGRITY RULE

FMMS MUST NEVER silently change historical mileage.

Changes caused by:

```text
Manual correction
OBD calibration
Initial ODO correction
Data import
Conflict resolution
```

MUST be traceable through an event/audit record.

Every distance value should be classified where applicable as:

```text
OBSERVED   = dashboard/OBD/GPS reading
CALCULATED = derived from trips/telemetry
ADJUSTED   = manually corrected with audit record
ESTIMATED  = inferred/calculated with uncertainty
```

This classification MUST be available to analytics and AI.


# SYSTEM CONFIGURATION, CONNECTION HEALTH & OFFLINE OPERATION

## 176. CONFIGURATION ARCHITECTURE

FMMS MUST separate configuration responsibilities between Web Administration and Android/ZESTECH.

### Web App — Central Administration

The Web App is the primary configuration center for:

```text
Database
AI Providers
AI Gateway
Storage
Authentication
Cloud/Backend
Telegram
Zalo
Notifications
Backup
System Health
User/Family Settings
Asset Settings
OBD Device Registry
```

### Android / ZESTECH — Operational Configuration

The Android/ZESTECH application should expose only operational settings:

```text
OBD Bluetooth
GPS
Trip Detection
Display
Units
Offline Storage
Cloud Sync Status
Connection Status
Device Information
```

Android MUST NOT expose production secrets or privileged backend credentials.

## 177. WEB SETTINGS STRUCTURE

Recommended navigation:

```text
Settings
├── General
├── Family / Users
├── Assets
├── OBD Devices
├── Data & Sync
├── Database
├── AI
├── Integrations
│   ├── Telegram
│   └── Zalo
├── Notifications
├── Backup
└── System Health
```

## 178. DATABASE & BACKEND HEALTH

Web Settings MUST provide a Database/Backend status page.

Example:

```text
DATABASE & BACKEND

Supabase
● Connected

Project:
FMMS

Database:
PostgreSQL
● Healthy

Storage:
● Healthy

Authentication:
● Healthy

Realtime:
● Connected

Edge Functions:
● Healthy

Last successful connection:
15/08/2026 09:32

[ Test Database Connection ]
[ Test Storage ]
[ Test Authentication ]
[ Test Edge Functions ]
```

Production users MUST NOT edit privileged database credentials from the normal UI.

Secrets belong in environment variables / secure secret management.

## 179. AI CONFIGURATION CENTER

Web Settings MUST contain a dedicated AI Configuration page.

Example:

```text
AI SYSTEM

AI Enabled                 ON
AI Chat                    ON
AI Reports                 ON
AI Insights                ON
AI Voice                   ON

Default Provider:
[ Gemini ▼ ]

Default Model:
[ configured model ]

Fallback Provider:
[ OpenAI ▼ ]
```

## 180. MULTI-AI PROVIDER MANAGEMENT

The AI system MUST support multiple providers through the AI Gateway.

Example:

```text
AI PROVIDERS

Gemini
● Connected
Last Test: 09:30
[ Test ]

OpenAI
● Connected
Last Test: 09:31
[ Test ]

Claude
○ Not Configured
[ Configure ]

Local LLM
○ Offline
[ Configure ]
```

The provider architecture MUST remain provider-independent.

Future providers can be added without changing the core FMMS business logic.

## 181. AI PROVIDER ROUTING

AI Gateway SHOULD support routing by task:

```text
Chat
Reports
Data Analysis
Summary
Voice
Private/Sensitive Processing
```

Example:

```text
Chat          → Gemini
Reports       → Claude
Analysis      → OpenAI
Private Data  → Local LLM
```

The actual routing MUST be configurable.

Fallback behavior SHOULD be supported:

```text
Primary AI
    ↓ failure
Fallback AI
    ↓ failure
AI unavailable
```

FMMS core functions MUST continue working when all AI providers are unavailable.

## 182. AI HEALTH MONITORING

System Health MUST show:

```text
AI Gateway
AI Context Engine
AI Tool Engine
Provider Status
Last Successful Request
Today's Request Count
Estimated Usage/Cost
```

Example:

```text
AI SYSTEM HEALTH

Gateway          ● ONLINE
Context Engine   ● ONLINE
Tool Engine      ● ONLINE
Gemini           ● ONLINE
OpenAI           ● ONLINE
Claude           ○ NOT CONFIGURED

Last successful request:
09:31:42

Today's requests:
27

Estimated cost:
$0.18
```

If the primary provider fails:

```text
Gemini           🔴 OFFLINE
OpenAI           🟢 ONLINE

Fallback:
OpenAI

AI Service:
● Available
```

## 183. SYSTEM HEALTH CENTER

Web MUST provide a centralized System Health dashboard.

Example:

```text
FMMS SYSTEM HEALTH

Web App             🟢 Healthy
Supabase DB         🟢 Healthy
Storage             🟢 Healthy
Auth                🟢 Healthy
Edge Functions      🟢 Healthy
AI Gateway          🟢 Healthy
Gemini              🟢 Connected
OpenAI              🟡 Not Configured
Telegram            🟢 Connected
Zalo                🟡 Not Configured
```

The dashboard SHOULD show timestamp and last successful check for each service.

## 184. ANDROID CONNECTION STATUS

Android/ZESTECH MUST provide a lightweight Connection Status screen.

Example:

```text
SYSTEM STATUS

OBD Bluetooth       🟢 Connected
GPS                 🟢 Connected
Internet            🟢 Connected
Supabase            🟢 Connected
Cloud Sync          🟢 Up to Date
AI                  🟢 Available

Last Sync:
09:32:14

Pending:
0 records
```

## 185. OFFLINE MODE

FMMS MUST support full operational offline mode for vehicle data collection.

Loss of:

```text
Internet
Supabase
AI
Telegram
Zalo
```

MUST NOT stop:

```text
OBD
GPS
Trip Detection
Mileage
Virtual ODO
Fuel calculations
Local data storage
```

Example:

```text
SYSTEM STATUS

Internet            🔴 Offline
Supabase             🔴 Unavailable
OBD                  🟢 Connected
GPS                  🟢 Connected

Mode:
🟠 OFFLINE MODE

Pending Sync:
42 records

Last Sync:
08:42
```

## 186. LOCAL-FIRST DATA ARCHITECTURE

Android MUST use a local database/queue for operational data.

Required architecture:

```text
                 ANDROID
                    │
        ┌───────────┴───────────┐
        │                       │
  Local Database          OBD / GPS
        │
        ▼
    Sync Queue
        │
        ▼
     Supabase
```

The application MUST NOT depend on a live Supabase connection for real-time vehicle data collection.

## 187. LOCAL DATA TO STORE

While offline, Android SHOULD retain at minimum:

```text
Last Known ODO
Current Virtual ODO
Trip Records
Pending Telemetry
Fuel Data
GPS Summary
ODO Events
Sync Queue
Last Successful Sync
Device ID
```

The exact raw telemetry retention remains configurable according to the telemetry policy.

## 188. AUTOMATIC SYNC RECOVERY

When connectivity returns:

```text
Offline Records
      ↓
Connection Test
      ↓
Authentication Check
      ↓
Upload Queue
      ↓
Server Validation
      ↓
Deduplication
      ↓
Supabase
      ↓
Queue Cleared
```

Synchronization MUST be:

```text
Automatic
Retryable
Idempotent
Resumable
```

Duplicate records MUST NOT be created after repeated connection failures/retries.

## 189. SYNC QUEUE UI

Android MUST show pending synchronization information.

Example:

```text
SYNC STATUS

Pending:
42 records

Trips:
3

Telemetry:
38

ODO Events:
1

Last Sync:
08:42

Connection:
Offline

[ Sync Now ]
```

When successful:

```text
Sync Complete

42 / 42 records uploaded
No pending data
```

## 190. CONNECTION RETRY POLICY

The Android application SHOULD use progressive retry/backoff.

Example:

```text
Retry
5 sec
15 sec
30 sec
1 min
5 min
15 min
```

The exact schedule should be configurable.

Manual:

```text
[ Retry Now ]
```

MUST also be available.

## 191. DATA SAFETY DURING CONNECTION LOSS

A trip MUST NOT be lost because of:

```text
Internet loss
Supabase outage
AI outage
Application backgrounding
Temporary Bluetooth interruption
```

Where practical, the Android app should checkpoint trip data periodically.

## 192. OBD / GPS / CLOUD INDEPENDENCE

These systems MUST be logically independent:

```text
OBD
GPS
Local Database
Cloud Sync
AI
```

Example:

```text
OBD      ✓
GPS      ✓
Local DB ✓
Cloud    ✕
AI       ✕
```

The trip can still be recorded.

## 193. ZESTECH SYSTEM STATUS

The 9-inch ZESTECH display SHOULD provide quick access to:

```text
OBD Status
GPS Status
Internet Status
Supabase Sync
AI Status
Pending Records
Last Sync
```

The detailed configuration remains in Web Settings.

## 194. SECURITY BOUNDARY

Android MUST NOT contain:

```text
Supabase Service Role Key
Database Password
AI Provider Secret Keys
Telegram Bot Secret
Zalo Secret
Production Admin Credentials
```

Only non-sensitive client configuration may be embedded.

## 195. SECRET MANAGEMENT

Secrets MUST be managed through:

```text
Vercel Environment Variables
Supabase Secrets
GitHub Actions Secrets
Equivalent secure secret manager
```

Never commit secrets to GitHub.

## 196. CONNECTION HEALTH API

The backend SHOULD expose a safe health endpoint that returns status only, not credentials.

Example:

```text
GET /health

{
  "web": "ok",
  "database": "ok",
  "storage": "ok",
  "auth": "ok",
  "ai_gateway": "ok"
}
```

Detailed provider diagnostics MUST be restricted to authorized administrators.

## 197. HEALTH CHECK FREQUENCY

Health checks SHOULD use appropriate intervals rather than excessive polling.

Example:

```text
Android:
On connection
Periodic lightweight check

Web:
On page load
Manual refresh
Periodic dashboard refresh

Backend:
Scheduled monitoring
```

## 198. USER-FACING ERROR STATES

Errors MUST be understandable.

Avoid:

```text
HTTP 500
ECONNREFUSED
PGRST116
```

as the only user-facing message.

Prefer:

```text
Unable to connect to FMMS Cloud.
Your data is safe locally and will sync automatically.
```

or:

```text
AI provider is temporarily unavailable.
FMMS vehicle functions are still operating normally.
```

## 199. SYSTEM STATUS LEVELS

Use a consistent status model:

```text
🟢 HEALTHY
🟡 DEGRADED
🔴 OFFLINE / ERROR
⚪ NOT CONFIGURED
🔵 SYNCING
```

This status model SHOULD be reused throughout Web and Android.

## 200. CONFIGURATION ACCEPTANCE CRITERIA

```text
[ ] Web is the primary configuration center
[ ] Database health page exists
[ ] Storage health page exists
[ ] Auth health page exists
[ ] Edge Function health page exists
[ ] AI configuration page exists
[ ] Multiple AI providers supported
[ ] AI provider testing supported
[ ] AI routing configurable
[ ] AI fallback supported
[ ] AI health visible
[ ] AI usage/cost visible
[ ] System Health dashboard exists
[ ] Android Connection Status exists
[ ] ZESTECH quick status exists
[ ] Offline mode supported
[ ] Local-first vehicle data collection supported
[ ] Sync queue supported
[ ] Automatic retry supported
[ ] Idempotent sync supported
[ ] Pending records visible
[ ] Last sync visible
[ ] OBD independent from cloud
[ ] GPS independent from cloud
[ ] AI independent from vehicle data collection
[ ] Secrets protected
[ ] Safe health endpoint exists
[ ] User-friendly error messages
[ ] Consistent health status indicators
```

## 201. ARCHITECTURAL RULE

The most important operational rule is:

```text
CLOUD FAILURE ≠ VEHICLE DATA FAILURE
AI FAILURE    ≠ VEHICLE DATA FAILURE
```

The vehicle application MUST continue collecting and safely storing:

```text
OBD
GPS
Trip
Mileage
Virtual ODO
Fuel
```

during connectivity outages.

Cloud synchronization, AI analysis and external messaging are secondary services that resume when connectivity becomes available.
---

# V5.2 — MASTER DATA, CORRECTION, WARRANTY & CONFIGURATION EXTENSION

> **Version:** 5.2  
> **Purpose:** Additive extension to V5.1. All existing Android, OBD, Web, Supabase, AI, deployment and multi-asset requirements remain valid.

## 200. SINGLE SOURCE OF TRUTH

FMMS MUST use Supabase PostgreSQL as the **Single Source of Truth** for persistent business and configuration data.

All mutable business information MUST be editable through the appropriate Web UI and persisted to Supabase. No production dashboard, Asset Detail, Analytics, Finance, Warranty or AI data may depend on hardcoded/mock values.

Editable business domains include:

```text
Asset master data
Documents
Insurance
Loans
Loan payments
Maintenance
Parts
Upgrades
Expenses
Warranty
Warranty claims
AI providers
AI configuration
API integrations
Dashboard configuration
Notification configuration
```

Derived values may be calculated, but their source/status must remain identifiable.

## 201. THREE DATA CLASSES

### 201.1 MASTER / BUSINESS DATA

User-managed:

```text
Asset information
License plate
VIN / chassis number
Engine number
Serial number
Technical specifications
Purchase information
Documents
Insurance
Loans
Loan payments
Maintenance
Parts
Upgrades
Expenses
Warranty
Warranty claims
AI/API configuration
Dashboard configuration
```

These support appropriate Create / Read / Update / Archive / Delete-or-Void operations according to lifecycle rules.

### 201.2 RAW TELEMETRY

System-generated:

```text
OBD RPM
OBD Speed
OBD Coolant
OBD Fuel Level
OBD Fuel Rate
OBD Voltage
OBD Engine Load
GPS
Raw trip telemetry
Raw OBD responses
```

Raw telemetry MUST NOT be directly editable by normal users and should remain immutable after ingestion.

### 201.3 DERIVED / CORRECTED DATA

Examples:

```text
Corrected fuel consumption
Estimated range
Cost/km
Virtual odometer
Daily distance
Monthly distance
Yearly distance
TCO
Analytics
AI summaries
```

Derived values may use calibration/correction configuration while preserving the original raw source.

## 202. ASSET MASTER DATA EDITING

Every Asset Detail page MUST provide `Edit Asset`.

Edit sections:

```text
Basic Information
Identity & Registration
Technical Specifications
Purchase & Value
Mileage / ODO
Fuel Configuration
Battery Configuration
OBD Configuration
Dashboard Display
Documents
Insurance
Warranty
Notes
Status / Lifecycle
```

Identity fields may include:

```text
Asset Name
Asset Type
Brand
Model
Variant / Trim
Manufacturing Year
Model Year
Color
License Plate
VIN / Chassis Number
Engine Number
Serial Number
Owner
Purchase Date
Purchase Price
Current Value
```

Fields MUST be capability-dependent.

## 203. VEHICLE IDENTITY HISTORY

Critical identity changes MUST NOT silently overwrite history.

Track changes to:

```text
License Plate
VIN
Chassis Number
Engine Number
Serial Number
Owner
Asset Status
```

Audit record:

```text
asset_id
field_name
previous_value
new_value
reason
changed_by
changed_at
```

## 204. ODO / DISTANCE RULE

Raw OBD ODO MUST NOT be manually edited.

If OBD, virtual or dashboard mileage appears wrong, use a controlled correction workflow:

```text
Raw OBD / GPS / Existing ODO
            ↓
       Validation
            ↓
Manual Correction / Calibration
            ↓
Corrected / Active Value
```

The raw source remains unchanged.

Correction UI:

```text
Current FMMS Mileage: 12,846 km
Actual Observed Mileage: 13,020 km
Difference: +174 km
Source: Dashboard
Reason: Manual verification

[Confirm Correction]
```

Store:

```text
previous_value
adjustment_value
new_value
source
reason
created_by
created_at
```

Never hard-delete correction history through normal UI.

## 205. TELEMETRY ANOMALY & COMPARISON

Compare independent sources where available:

```text
Official Dashboard ODO
OBD ODO
Virtual ODO
GPS Distance
Manual Reference
```

Display:

```text
MATCHED
SMALL DIFFERENCE
NEEDS CALIBRATION
UNAVAILABLE
```

For fuel:

```text
OBD Consumption
        vs
Actual Full-Tank Consumption
```

An abnormal discrepancy MUST trigger a warning rather than silently changing data.

## 206. FUEL CONSUMPTION CALIBRATION

Fuel consumption is a primary calibration use case.

Example:

```text
OBD average: 6.9 L/100 km
Actual measured: 7.4 L/100 km
```

Store both:

```text
RAW OBD VALUE = 6.9
CALIBRATED VALUE = 7.4
```

Calibration record:

```text
asset_id
metric
raw_value
reference_value
correction_factor
calibration_method
reason
source
created_by
created_at
```

Recommended method:

```text
Previous Full Tank
        ↓
Validated Distance
        ↓
Next Full Tank
        ↓
Actual Liters Added
        ↓
Actual L/100km
```

Raw telemetry remains unchanged.

## 207. DERIVED RANGE

Estimated range must identify whether it uses raw or calibrated consumption.

```text
Fuel Remaining ÷ Consumption × 100 = Estimated Range
```

Example:

```text
Fuel remaining = 20 L
Calibrated consumption = 7.4 L/100 km
Estimated range ≈ 270 km
```

Expose:

```text
Range Source:
CALIBRATED / RAW / ESTIMATED

Confidence:
HIGH / MEDIUM / LOW / LEARNING
```

## 208. FINANCE / LOAN FULL EDITABILITY

Every asset may have zero or more loans.

Loan fields:

```text
Lender
Contract Number / Alias
Loan Type
Original Principal
Down Payment
Financed Amount
Interest Rate
Interest Type
Term
Start Date
First Payment Date
Maturity Date
Payment Frequency
Payment Day
Monthly Payment
Fees
Current Outstanding Balance
Status
Notes
```

When loan parameters change:

```text
Edit Loan
    ↓
Validate
    ↓
Recalculate remaining schedule
    ↓
Preserve historical payments
    ↓
Update current balance / future schedule
    ↓
Audit change
```

Historical paid transactions MUST NOT be silently modified or destroyed.

## 209. LOAN PAYMENT MANAGEMENT

Each payment is independently manageable:

```text
Payment #
Due Date
Principal
Interest
Fees
Total
Paid Date
Status
Remaining Balance
Notes
```

Actions:

```text
Edit
Void
Correct
View
```

Corrections must create an audit event. Financial history must not be hard-deleted through normal UI.

## 210. DOCUMENT MANAGEMENT

Documents MUST support:

```text
Add
Edit Metadata
Replace File
Archive
View History
```

Examples:

```text
Vehicle Registration
Insurance
Inspection
Purchase Contract
Loan Contract
Warranty Certificate
Invoice
Maintenance Invoice
Part Invoice
Upgrade Invoice
Other
```

Metadata:

```text
document_type
document_number
issue_date
expiry_date
issuer
related_asset
related_part
related_upgrade
related_warranty
storage_path
notes
```

Document versions SHOULD be retained when replaced.

# 211. WARRANTY & COVERAGE MANAGEMENT

FMMS MUST provide a dedicated **Warranty & Coverage Management** module.

Warranty is separate from Insurance.

Supported scopes:

```text
Vehicle Manufacturer Warranty
Dealer Warranty
Extended Warranty
Part Warranty
Accessory Warranty
Upgrade Warranty
Battery Warranty
Component Warranty
Other
```

## 212. VEHICLE WARRANTY

Fields:

```text
asset_id
warranty_type
provider
warranty_number
start_date
expiry_date
start_mileage
mileage_limit
coverage_description
terms
status
document_id
notes
```

Statuses:

```text
ACTIVE
EXPIRING_SOON
EXPIRED
VOID
```

The system automatically calculates status.

## 213. PART / ACCESSORY WARRANTY

Each installed part/accessory may have independent warranty:

```text
Part
Brand
Model
Part Number
Serial Number
Supplier
Purchase Date
Installation Date
Purchase Price
Warranty Provider
Warranty Start
Warranty Expiry
Warranty Mileage Limit
Coverage
Invoice
Warranty Document
Notes
```

Examples:

```text
Dashcam
OBD Adapter
Battery
Tire
Brake Component
Wheel
Helmet
GPS Tracker
Camera
Android Head Unit
```

## 214. UPGRADE WARRANTY

Each upgrade may have independent warranty.

Examples:

```text
Android Head Unit
Suspension Upgrade
Brake Upgrade
Exhaust
ECU Tune
Wheel Upgrade
Lighting
Audio System
Performance Parts
```

Track:

```text
Upgrade
Purchase Date
Installation Date
Vendor
Purchase Cost
Installation Cost
Warranty
Warranty Expiry
Serial Number
Coverage
Documents
Notes
```

## 215. WARRANTY ALERTS

Dashboard and Asset Detail MUST expose:

```text
EXPIRED
EXPIRING IN 7 DAYS
EXPIRING IN 30 DAYS
EXPIRING IN 60 DAYS
EXPIRING IN 90 DAYS
ACTIVE
```

Alert windows are configurable:

```text
Settings
→ Notifications
→ Warranty Alerts

[✓] 7 days
[✓] 30 days
[✓] 60 days
[✓] 90 days
```

## 216. WARRANTY CLAIM MANAGEMENT

Implement Warranty Claims.

Fields:

```text
claim_id
asset_id
related_warranty_id
related_part_id
related_upgrade_id
claim_date
problem_description
provider
claim_number
status
resolution
resolution_date
cost
covered_amount
user_cost
attachments
notes
```

Statuses:

```text
DRAFT
SUBMITTED
UNDER_REVIEW
APPROVED
REJECTED
REPAIRED
REPLACED
CLOSED
```

## 217. PART / UPGRADE LIFECYCLE

Parts and upgrades support:

```text
ACTIVE
REMOVED
REPLACED
SOLD
DISPOSED
```

When replaced, preserve the old record.

## 218. COMPONENT MILEAGE

Compatible components must accumulate usage distance:

```text
installed_distance
current_distance
replacement_threshold
remaining_distance
```

Examples:

```text
Road Bike Chain
Cassette
Tire
Wheelset
Brake Pads
Motorcycle Chain
Sprocket
Tires
Battery
```

## 219. WARRANTY DASHBOARD

Provide a fleet-wide warranty view:

```text
WARRANTY

🔴 Expired
BMW Battery

🟠 Expiring Soon
Mazda Dashcam — 18 days

🟡 Expiring Soon
Mazda Manufacturer Warranty — 118 days

🟢 Active
BMW Brake Upgrade — 426 days
```

Clicking an item opens its related asset/item/warranty.

## 220. AI / API / INTEGRATION CONFIGURATION FROM WEB

Normal AI and integration configuration MUST NOT require source-code changes.

Provide:

```text
Settings
├── AI & Assistant
├── Integrations
├── API
├── Notifications
├── Dashboard
└── System Health
```

AI providers:

```text
OpenAI
Google Gemini
Anthropic Claude
Local LLM
Self-hosted LLM
Future providers
```

Each provider:

```text
Enabled
Provider Name
API Endpoint
API Key
Model
Temperature
Max Tokens
Default / Task Routing
Test Connection
Last Test
Status
```

Multiple providers may be configured simultaneously.

## 221. API / INTEGRATION CONFIGURATION

Examples:

```text
Supabase
AI Gateway
Google Sheets
Telegram
Zalo
Webhooks
Future APIs
```

Each integration:

```text
Enabled
Endpoint
Credential / Secret
Configuration
Test Connection
Last Success
Last Failure
Error Message
```

Secrets MUST be masked and securely stored. Never expose server-side secrets in frontend bundles.

## 222. SYSTEM HEALTH

System Health MUST use real connectivity tests.

Example:

```text
Supabase
● CONNECTED
Latency: 82 ms

AI Gateway
● CONNECTED

Gemini
● CONFIGURED / CONNECTION PASSED

OpenAI
● NOT CONFIGURED

Claude
● CONNECTION FAILED

Telegram
● NOT CONFIGURED

Zalo
● NOT CONFIGURED
```

Do not display `HEALTHY` merely because a configuration record exists.

## 223. CONFIGURATION DATABASE

Conceptual entities:

```text
ai_providers
ai_provider_credentials
ai_task_routes
integration_configs
notification_settings
dashboard_settings
asset_card_settings
system_health_logs
```

Sensitive credentials must use secure server-side storage/encryption mechanisms appropriate to the deployment.

## 224. DASHBOARD CONFIGURATION

Dashboard fields remain user-configurable:

```text
Photo
Asset Name
Asset Type
Purchase Price
License Plate
VIN
Serial Number
Mileage
Virtual Mileage
Fuel Level
Fuel Consumption
Estimated Range
Current Value
Loan Balance
Maintenance Due
Warranty Expiry
Insurance Expiry
Last Trip/Ride
Battery Level
Battery Range
Status
Custom Fields
```

Each field:

```text
Visible ON/OFF
Display Order
Custom Label
```

Unsupported fields MUST remain hidden.

## 225. GLOBAL DATA EDITING RULE

Production data displayed by:

```text
Dashboard
Asset Detail
Finance
Loan schedule
Insurance
Documents
Warranty
Parts
Upgrades
Expenses
Maintenance
Analytics
Reports
AI context
```

must come from Supabase or calculations backed by Supabase.

Hardcoded values are permitted only in explicit demo/test seed data and must never appear as live production data.

## 226. AUDIT LOG

Critical modifications require:

```text
entity_type
entity_id
field_name
previous_value
new_value
operation
reason
user_id
timestamp
source
```

High-priority audit targets:

```text
Asset identity
ODO correction
Fuel calibration
Loan
Loan payment
Insurance
Warranty
Warranty claim
Document replacement
AI configuration
API configuration
```

## 227. AI ACCESS TO WARRANTY / BUSINESS DATA

The AI Context Builder may access authorized:

```text
Asset information
Warranty
Warranty expiry
Warranty claims
Parts
Upgrades
Maintenance
Insurance
Documents
Loans
Expenses
Mileage
Fuel
Trips/Rides
Analytics
```

Example questions:

```text
"Xe nào sắp hết bảo hành?"
"Phụ kiện nào tháng này hết bảo hành?"
"Xe Mazda2 còn bảo hành bao lâu?"
"Phụ tùng nào đã hết bảo hành?"
"Trong năm nay tôi đã claim bảo hành những gì?"
"Những linh kiện nào sắp đến hạn thay?"
"Nhà cung cấp nào có nhiều warranty claim nhất?"
```

AI must distinguish:

```text
Measured
Database Record
Calculated
Estimated
AI Interpretation
AI Recommendation
```

## 228. AI WRITE ACTIONS

AI MUST NOT have unrestricted database write access.

Example:

```text
AI:
"Bạn có muốn ghi nhận khoản chi 1,200,000 ₫ cho Mazda2?"

[Cancel] [Confirm]
```

Only after explicit confirmation may controlled tools execute:

```text
create_expense()
create_maintenance_record()
create_fuel_log()
create_note()
```

Actions must be audited.

## 229. UPDATED DATABASE MODEL

Extend the V5.1 asset model with:

```text
assets
asset_types
asset_categories
asset_capabilities
asset_groups
asset_documents
asset_images

trips
rides
mileage_records
telemetry_samples

fuel_logs
battery_logs
charging_logs

maintenance_records
parts
asset_parts
upgrades
expenses

loans
loan_payments

insurance_policies
registrations

warranties
warranty_items
warranty_claims

vendors
asset_valuations

odometer_records
odometer_adjustments
telemetry_calibrations
fuel_calibrations

ai_providers
ai_provider_credentials
ai_task_routes

integration_configs
notification_settings
dashboard_settings
asset_card_settings

audit_logs
sync_queue

household_members
invitations
```

All asset-specific records MUST contain `asset_id`.

## 230. RELATIONSHIP MODEL

```text
                         ASSET
                           │
        ┌──────────────────┼───────────────────┐
        │                  │                   │
    MASTER DATA        OPERATION           FINANCE
        │                  │                   │
  Identity             Trips/Rides          Loans
  Documents            Fuel                 Payments
  Insurance            Mileage
  Warranty             Telemetry
        │                  │
        └──────────┬───────┘
                   │
             PARTS / UPGRADES
                   │
              Warranty
              Lifecycle
              Component Mileage
                   │
                   ▼
                EXPENSE
                   │
                   ▼
               ANALYTICS
                   │
                   ▼
                   AI
```

## 230.1 LOGIN & ACCOUNT MANAGEMENT

Auth, roles, onboarding, session, and family sharing for the Web + Android.

### 230.1.1 Authentication Providers

```text
[REQUIRED] Email + password
[OPTIONAL] Google OAuth (Sign in with Google)
[OPTIONAL] Apple Sign-In (iOS future)
```

- Email/password via Supabase Auth (`supabase.auth.signUp`, `signInWithPassword`).
- Email confirmation MUST be enabled before first production use.
- SMTP (custom domain) MUST be configured so confirmation / reset emails are delivered.
- OAuth enabled only when redirect allow-list is configured (Web + Android deep link).

### 230.1.2 Registration & Onboarding Flow

```text
1. Sign up (email + password)
2. Confirm email (clicked link → auto sign-in)
3. Create Household / Family (owner)
4. Create first Asset (fleet/vehicle) — guided wizard
5. Optional: invite members, pair Android device via QR
```

- Onboarding is a guided multi-step flow; dashboard appears only after step 3+.
- A user who is not yet in any household sees an empty-state "Create your family space".

### 230.1.3 Login Page Behavior (Web)

```text
- /login renders STANDALONE — full-screen, NO app shell / sidebar / header
- No redirect loop when already authenticated (goes straight to dashboard)
- After login → redirect to previous intended page (or /dashboard)
- Logout clears session AND redirects to /login
- Session expiry → silent refresh; if refresh fails → redirect to /login
```

- The standalone rendering is enforced at the layout level (ClientShell skips shell on
  auth routes), so login is never wrapped by the sidebar.
- Auth routes: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/auth/callback`.

### 230.1.4 Password Flows

```text
[ ] Forgot password → email reset link
[ ] Reset password page (new password + confirm)
[ ] Password strength rules (min 8 chars, letter + number)
[ ] Signed-out users only; changing password signs out other sessions
```

### 230.1.5 Roles & Family Sharing

```text
owner    — full access, manage members, transfer ownership
admin    — edit all data, manage assets, create invites
member   — edit data (per 230.2), no member management
viewer   — read-only
```

- Each asset belongs to exactly one `household_id` (plus `owner_id` = creating user).
- `household_members` table maps user → household → role.
- Assets are visible to every member of the household via RLS (not only `owner_id`).
- Owner may transfer ownership; audit-logged.

### 230.1.6 Invites

```text
- Owner/Admin sends invite (email) → creates `invitations` row + token
- Invite link: web.invite/{token} (Web) or app deep link (Android)
- Invitee joins household on accept; token single-use, expires in 7 days
- Invites can be revoked; revoked tokens are rejected
```

### 230.1.7 Session & Security

```text
- Session cookie managed by Supabase Auth (persisted)
- Refresh token renewed automatically; refresh token rotation ON
- All /api/* routes MUST authenticate (middleware + per-route check)
- RLS keys on household_id / owner_id, not just on being signed in
- Rate limit: login / signup / reset attempts per IP+email
- Sensitive credentials NEVER sent to the client
```

### 230.1.8 Android Authentication

```text
- Android login screen: email/password (+ Google if enabled)
- Token stored in EncryptedSharedPreferences / DataStore (secure storage)
- Session refresh handled by Android client; auto re-login on token expiry
- Logout clears local data + tokens (per 230.3.4)
- Device ↔ account binding via QR (pair screen) — see 230.3
```

## 230.2 GLOBAL EDIT & VALIDATION RULES

Applies to every edit action across master data, finance, warranty, documents.

### 230.2.1 Edit Permissions

```text
owner / admin → create + edit + void/delete
member        → create + edit (no delete of shared records)
viewer        → read-only, edit controls hidden
```

### 230.2.2 Field Validation (Business Rules)

```text
- Odometer: strictly non-decreasing (new value ≥ current corrected value)
- ODO correction: requires reason + optional photo evidence (audited)
- VIN: 17 chars, alphanumeric (no I/O/Q)
- License plate: uppercase, format per locale (e.g. XX-XXX.XX)
- Dates: end_date > start_date; expiry ≥ today for active warranties
- Status: constrained enum (ASSET_STATUS / WARRANTY_STATUS / LOAN_STATUS)
- Currency: positive, 2 decimals; quantity > 0
- Year: 1980 ≤ model_year ≤ current year + 1
```

Invalid values are rejected client-side AND re-validated server-side (RLS/DB constraints).

### 230.2.3 Edit UX

```text
- Edit via modal/inline form bound to the record type
- Show original vs new value for critical fields (ODO, VIN, plate, loan amount)
- Save requires explicit confirmation; Cancel discards without side effects
- Derived/calculated fields are NOT directly editable (computed from source)
- Raw telemetry (telemetry_samples, odometer raw) is NEVER editable
```

### 230.2.4 Concurrency & Conflicts

```text
- Optimistic concurrency: updated_at check; conflict → prompt "reload"
- Offline edits queue locally (sync_queue), sync later (last-writer-wins)
- Conflicting offline edit → version conflict is logged, UI notifies owner
```

### 230.2.5 Edit Audit

```text
- Every CRITICAL change writes audit_logs: who, when, old value → new value
- Critical = ODO, identity (VIN/plate/engine), loan, ownership, warranty status
- Audit history is viewable in the UI (asset detail → History)
- audit_logs are append-only; RLS blocks UPDATE/DELETE
```

### 230.2.6 Delete / Void Policy

```text
- Business data (loan, expense, warranty, document) → VOID or soft-delete, never hard-delete
- Voided records stay in DB and reports; marked with status = VOID
- Raw telemetry: never deleted (data retention rules)
- Asset deletion: soft archive, requires password confirmation, audited
```

## 230.3 ANDROID AUTH & DEVICE LIFECYCLE

Complements section 7 / 101 with the account + permission + lifecycle contract.

### 230.3.1 Android Login

```text
- Sign-in screen (email/password, Google optional) before any data access
- Onboarding: sign-in → household check → device pairing → vehicle pairing
- Re-login screen shown on session expiry; no silent data wipe
```

### 230.3.2 Secure Token Storage

```text
- Access/refresh tokens in EncryptedSharedPreferences (KeyStore-backed)
- NO tokens in SharedPreferences / plaintext / SQLite / logs
- On app update, tokens survive; on reinstall, user re-signs-in
- Biometric unlock optional (hardware keyguard)
```

### 230.3.3 Device Pairing & Binding

```text
- QR screen (Web shows QR with device-pair token) — existing 7.3.3
- Pairing binds: account → device_id → vehicle_id
- device_id is stored server-side; duplicates rejected
- Re-pair / unbind supported; unbind clears device data locally
```

### 230.3.4 Logout & Data Clearing

```text
- Logout: clear tokens + pending local queue after successful flush
- "Log out from all devices" optional (revokes sessions server-side)
- Re-pair of same vehicle requires the household owner/admin approval
```

### 230.3.5 Android Runtime Permissions

```text
- Android 12+ (API 31+): Bluetooth connect/scan runtime permission
- Location (background) required for geofence / charging detection
- Notification permission for foreground-service status
- Permission denial → degrade gracefully (OBD off, GPS off) + explain screen
```

### 230.3.6 Foreground Service

```text
- Continuous OBD reading MUST run as foreground service when screen is off
- Foreground service type declared (connectedDevice)
- Persistent notification: connection status + battery + odo
- Battery-optimization exemption requested on first run
```

### 230.3.7 Offline Queue (Android)

```text
- Logs (trips, fuel, battery, ODO, expenses) queued in Room when offline
- Automatic sync on reconnect (existing 5.13 / 186–188)
- Queue is durable: survives app restart and force-stop
```

## 231. V5.2 ACCEPTANCE CHECKLIST

### Master Data

```text
[ ] Asset can be created
[ ] Asset can be edited
[ ] Asset identity can be updated
[ ] License plate can be changed
[ ] VIN can be changed
[ ] Engine number can be changed
[ ] Asset status can be changed
[ ] Critical changes create history
```

### ODO / Telemetry

```text
[ ] Raw OBD telemetry cannot be directly edited
[ ] ODO discrepancy can be detected
[ ] ODO correction workflow exists
[ ] ODO correction is audited
[ ] Fuel calibration exists
[ ] Raw fuel telemetry remains unchanged
[ ] Corrected consumption can be used by analytics
[ ] Range calculation can use calibrated consumption
```

### Finance

```text
[ ] Loan can be created
[ ] Loan can be edited
[ ] Loan schedule recalculates
[ ] Historical payments are preserved
[ ] Payment can be corrected/voided
[ ] Financial changes are audited
```

### Documents

```text
[ ] Document can be added
[ ] Document metadata can be edited
[ ] Document can be replaced
[ ] Document version/history is preserved
```

### Warranty

```text
[ ] Vehicle warranty supported
[ ] Part warranty supported
[ ] Upgrade warranty supported
[ ] Warranty expiry calculated
[ ] Warranty alerts configurable
[ ] Warranty dashboard exists
[ ] Warranty claim supported
[ ] Warranty history preserved
[ ] Part/upgrade lifecycle supported
[ ] Component mileage supported
```

### Configuration

```text
[ ] AI providers configurable from Web
[ ] Multiple AI providers supported
[ ] AI model configurable
[ ] API endpoint configurable
[ ] AI/API connection test works
[ ] Telegram configurable
[ ] Zalo configurable
[ ] Google Sheets configurable
[ ] Dashboard fields configurable
[ ] Notification settings configurable
[ ] System Health uses real checks
```

### Login / Account

```text
[ ] Email + password sign up works
[ ] Email confirmation delivered and auto-signs-in
[ ] Login page renders standalone (no sidebar/shell)
[ ] Forgot/reset password flow works
[ ] Logout returns to /login and clears session
[ ] Session refresh works; expiry redirects to /login
[ ] Owner/Admin/Member/Viewer roles enforced
[ ] Invite flow works; token single-use and expires
[ ] Household members share assets via RLS
[ ] All /api/* routes require authentication
[ ] Auth callback works without hardcoded env values
```

### Edit Integrity

```text
[ ] Edit permission matrix enforced by role
[ ] ODO non-decreasing rule enforced
[ ] VIN/plate/date/status validation enforced
[ ] Critical edits write audit_logs (who/what/old→new)
[ ] Audit history viewable in UI
[ ] Void/soft-delete policy in place; raw telemetry never deleted
[ ] Optimistic concurrency + offline conflict handling work
```

### Android

```text
[ ] Android login screen works; tokens stored securely
[ ] Session refresh on device; re-login on expiry
[ ] QR pairing binds account → device → vehicle
[ ] Bluetooth runtime permission handled (Android 12+)
[ ] OBD reading runs as foreground service when screen off
[ ] Battery optimization exemption requested
[ ] Logout clears tokens + flushes local queue
[ ] Offline logs queue and auto-sync on reconnect
```

### Data Integrity

```text
[ ] Supabase is the business-data source of truth
[ ] No production hardcoded values
[ ] Raw telemetry preserved
[ ] Derived data identifies source/status
[ ] Audit log implemented
[ ] RLS enforced
[ ] Sensitive credentials protected
[ ] AI has no unrestricted database write access
```

## 232. V5.2 FINAL PRINCIPLE

FMMS is a **long-term Family Mobility Asset Management System**, not merely an OBD dashboard.

```text
                    FMMS
                     │
       ┌─────────────┼─────────────┐
       │             │             │
    MASTER        OPERATION       AI
     DATA           DATA        ASSISTANT
       │             │             │
 Vehicle/Asset     OBD/GPS       Chat
 Documents         Trips         Reports
 Finance            Fuel          Summary
 Warranty           Mileage       Insights
 Parts              Telemetry     Automation
 Upgrades           Rides         Voice
 Expenses
 Insurance
       │
       ▼
 SUPABASE SINGLE SOURCE OF TRUTH
       │
       ├── Web
       ├── Android
       ├── ZESTECH
       ├── AI
       ├── Telegram
       └── Zalo
```

Core rule:

```text
USER-OWNED BUSINESS DATA
→ editable from Web
→ persisted to Supabase
→ audited when critical

RAW OBD/GPS DATA
→ generated automatically
→ preserved
→ never directly edited

ABNORMAL TELEMETRY
→ compare
→ calibrate/correct through controlled workflow
→ preserve raw value

WARRANTY / PARTS / UPGRADES
→ full lifecycle management
→ independent warranty
→ expiry alerts
→ claims
→ historical records

AI / API
→ configurable from Web
→ multi-provider
→ replaceable
→ secure
→ optional
```

The core FMMS MUST remain fully functional when all AI providers are offline.
