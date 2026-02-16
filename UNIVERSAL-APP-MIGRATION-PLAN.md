# Universal App Migration Plan - FinChronicle

## Goal
Convert FinChronicle PWA to universal app supporting:
- 📱 Mobile: iOS, Android
- 💻 Desktop: Windows, macOS, Linux
- 🌐 Web: Keep existing PWA

## Recommended Approach: Flutter

### Why Flutter?
- ✅ Single codebase for 6+ platforms
- ✅ 90% code sharing across all platforms
- ✅ Offline-first built-in (Hive database)
- ✅ Privacy-first (no backend needed)
- ✅ Beautiful, consistent UI
- ✅ Perfect for finance apps (Decimal precision)

### Timeline: 6-8 Weeks

---

## Phase 1: Setup & Planning (Week 1)

### 1.1 Install Flutter
```bash
# macOS
brew install flutter

# Verify installation
flutter doctor

# Enable all platforms
flutter config --enable-windows-desktop
flutter config --enable-macos-desktop
flutter config --enable-linux-desktop
flutter config --enable-web
```

### 1.2 Create Project
```bash
flutter create finchronicle_universal
cd finchronicle_universal

# Add dependencies
flutter pub add hive hive_flutter
flutter pub add hive_generator --dev
flutter pub add build_runner --dev
flutter pub add path_provider
flutter pub add intl
flutter pub add file_picker
flutter pub add csv
flutter pub add shared_preferences
```

### 1.3 Project Structure
```
lib/
├── main.dart
├── models/
│   └── transaction.dart
├── services/
│   ├── storage_service.dart      # Hive database
│   ├── export_service.dart       # CSV export/import
│   └── settings_service.dart     # Currency, dark mode
├── screens/
│   ├── home_screen.dart          # Main screen with tabs
│   ├── add_transaction_screen.dart
│   ├── transactions_list_screen.dart
│   └── analytics_screen.dart
├── widgets/
│   ├── transaction_card.dart
│   ├── summary_card.dart
│   └── month_filter.dart
├── utils/
│   ├── formatters.dart           # formatCurrency, formatDate
│   ├── constants.dart            # Categories, currencies
│   └── theme.dart                # Light/dark themes
└── providers/                    # State management (optional)
    └── transaction_provider.dart
```

---

## Phase 2: Core Models & Storage (Week 2)

### 2.1 Transaction Model
```dart
// lib/models/transaction.dart
import 'package:hive/hive.dart';

part 'transaction.g.dart';

@HiveType(typeId: 0)
class Transaction extends HiveObject {
  @HiveField(0)
  late int id;

  @HiveField(1)
  late String type; // 'income' or 'expense'

  @HiveField(2)
  late double amount;

  @HiveField(3)
  late String category;

  @HiveField(4)
  late DateTime date;

  @HiveField(5)
  late String notes;

  @HiveField(6)
  late DateTime createdAt;

  Transaction({
    required this.id,
    required this.type,
    required this.amount,
    required this.category,
    required this.date,
    required this.notes,
    required this.createdAt,
  });

  // Helper methods
  bool get isExpense => type == 'expense';
  bool get isIncome => type == 'income';

  String get monthKey => '${date.year}-${date.month.toString().padLeft(2, '0')}';
}
```

### 2.2 Storage Service
```dart
// lib/services/storage_service.dart
import 'package:hive_flutter/hive_flutter.dart';
import '../models/transaction.dart';

class StorageService {
  static const String _boxName = 'transactions';
  static Box<Transaction>? _box;

  // Initialize Hive
  static Future<void> init() async {
    await Hive.initFlutter();
    Hive.registerAdapter(TransactionAdapter());
    _box = await Hive.openBox<Transaction>(_boxName);
  }

  // Save transaction
  static Future<void> saveTransaction(Transaction transaction) async {
    await _box!.put(transaction.id, transaction);
  }

  // Get all transactions
  static List<Transaction> getAllTransactions() {
    return _box!.values.toList()
      ..sort((a, b) => b.date.compareTo(a.date));
  }

  // Get by month
  static List<Transaction> getByMonth(String monthKey) {
    return _box!.values
        .where((t) => t.monthKey == monthKey)
        .toList()
      ..sort((a, b) => b.date.compareTo(a.date));
  }

  // Delete transaction
  static Future<void> deleteTransaction(int id) async {
    await _box!.delete(id);
  }

  // Get totals
  static Map<String, double> getMonthTotals(String monthKey) {
    final transactions = getByMonth(monthKey);
    double income = 0;
    double expense = 0;

    for (var t in transactions) {
      if (t.isIncome) {
        income += t.amount;
      } else {
        expense += t.amount;
      }
    }

    return {
      'income': income,
      'expense': expense,
      'net': income - expense,
    };
  }
}
```

---

## Phase 3: UI Components (Week 3-4)

### 3.1 Main App Structure
```dart
// lib/main.dart
import 'package:flutter/material.dart';
import 'services/storage_service.dart';
import 'screens/home_screen.dart';
import 'utils/theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize storage
  await StorageService.init();

  runApp(const FinChronicleApp());
}

class FinChronicleApp extends StatelessWidget {
  const FinChronicleApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'FinChronicle',
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system, // Respects system preference
      home: const HomeScreen(),
    );
  }
}
```

### 3.2 Home Screen with Tabs
```dart
// lib/screens/home_screen.dart
import 'package:flutter/material.dart';
import 'add_transaction_screen.dart';
import 'transactions_list_screen.dart';
import 'analytics_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = [
    const AddTransactionScreen(),
    const TransactionsListScreen(),
    const AnalyticsScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _screens[_currentIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) {
          setState(() => _currentIndex = index);
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.add_circle_outline),
            selectedIcon: Icon(Icons.add_circle),
            label: 'Add',
          ),
          NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long),
            label: 'Transactions',
          ),
          NavigationDestination(
            icon: Icon(Icons.analytics_outlined),
            selectedIcon: Icon(Icons.analytics),
            label: 'Analytics',
          ),
        ],
      ),
    );
  }
}
```

### 3.3 Transaction Card Widget
```dart
// lib/widgets/transaction_card.dart
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/transaction.dart';
import '../utils/formatters.dart';

class TransactionCard extends StatelessWidget {
  final Transaction transaction;
  final VoidCallback? onTap;
  final VoidCallback? onDelete;

  const TransactionCard({
    Key? key,
    required this.transaction,
    this.onTap,
    this.onDelete,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isExpense = transaction.isExpense;
    final color = isExpense ? Colors.red : Colors.green;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: color.withOpacity(0.1),
          child: Icon(
            isExpense ? Icons.arrow_downward : Icons.arrow_upward,
            color: color,
          ),
        ),
        title: Text(transaction.category),
        subtitle: Text(
          '${DateFormat('MMM dd, yyyy').format(transaction.date)}'
          '${transaction.notes.isNotEmpty ? '\n${transaction.notes}' : ''}',
        ),
        trailing: Text(
          formatCurrency(transaction.amount),
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        onTap: onTap,
        onLongPress: onDelete,
      ),
    );
  }
}
```

---

## Phase 4: Business Logic (Week 5)

### 4.1 Formatters
```dart
// lib/utils/formatters.dart
import 'package:intl/intl.dart';

String formatCurrency(double amount, {String currency = 'INR'}) {
  final symbols = {
    'INR': '₹',
    'USD': '\$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
  };

  final formatter = NumberFormat('#,##,###.##');
  return '${symbols[currency] ?? currency} ${formatter.format(amount)}';
}

String formatDate(DateTime date) {
  return DateFormat('dd MMM yyyy').format(date);
}

String formatMonth(DateTime date) {
  return DateFormat('MMMM yyyy').format(date);
}
```

### 4.2 CSV Export
```dart
// lib/services/export_service.dart
import 'dart:io';
import 'package:csv/csv.dart';
import 'package:path_provider/path_provider.dart';
import 'package:file_picker/file_picker.dart';
import '../models/transaction.dart';

class ExportService {
  // Export to CSV
  static Future<File?> exportToCSV(List<Transaction> transactions) async {
    try {
      // Prepare CSV data
      List<List<String>> rows = [
        ['Date', 'Type', 'Category', 'Amount', 'Notes']
      ];

      for (var t in transactions) {
        rows.add([
          t.date.toIso8601String().split('T')[0],
          t.type,
          t.category,
          t.amount.toString(),
          t.notes,
        ]);
      }

      // Convert to CSV
      String csv = const ListToCsvConverter().convert(rows);

      // Save file
      final directory = await getApplicationDocumentsDirectory();
      final fileName = 'finchronicle_export_${DateTime.now().millisecondsSinceEpoch}.csv';
      final file = File('${directory.path}/$fileName');
      await file.writeAsString(csv);

      return file;
    } catch (e) {
      print('Export error: $e');
      return null;
    }
  }

  // Import from CSV
  static Future<List<Transaction>> importFromCSV() async {
    try {
      // Pick file
      FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['csv'],
      );

      if (result == null) return [];

      final file = File(result.files.single.path!);
      final csvString = await file.readAsString();

      // Parse CSV
      List<List<dynamic>> rows = const CsvToListConverter().convert(csvString);

      List<Transaction> transactions = [];

      // Skip header row
      for (int i = 1; i < rows.length; i++) {
        final row = rows[i];
        if (row.length < 4) continue;

        transactions.add(Transaction(
          id: DateTime.now().millisecondsSinceEpoch + i,
          date: DateTime.parse(row[0]),
          type: row[1],
          category: row[2],
          amount: double.parse(row[3].toString()),
          notes: row.length > 4 ? row[4] : '',
          createdAt: DateTime.now(),
        ));
      }

      return transactions;
    } catch (e) {
      print('Import error: $e');
      return [];
    }
  }
}
```

---

## Phase 5: Platform Customization (Week 6)

### 5.1 Responsive Layout
```dart
// lib/utils/responsive.dart
import 'package:flutter/material.dart';

class Responsive extends StatelessWidget {
  final Widget mobile;
  final Widget? tablet;
  final Widget desktop;

  const Responsive({
    Key? key,
    required this.mobile,
    this.tablet,
    required this.desktop,
  }) : super(key: key);

  static bool isMobile(BuildContext context) =>
      MediaQuery.of(context).size.width < 600;

  static bool isTablet(BuildContext context) =>
      MediaQuery.of(context).size.width >= 600 &&
      MediaQuery.of(context).size.width < 1200;

  static bool isDesktop(BuildContext context) =>
      MediaQuery.of(context).size.width >= 1200;

  @override
  Widget build(BuildContext context) {
    if (isDesktop(context)) {
      return desktop;
    } else if (isTablet(context)) {
      return tablet ?? mobile;
    } else {
      return mobile;
    }
  }
}
```

### 5.2 Desktop Layout (Master-Detail)
```dart
// For desktop: Show list and details side-by-side
class DesktopLayout extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        // Left panel: Transactions list
        Expanded(
          flex: 1,
          child: TransactionsListScreen(),
        ),
        VerticalDivider(width: 1),
        // Right panel: Details/Analytics
        Expanded(
          flex: 2,
          child: AnalyticsScreen(),
        ),
      ],
    );
  }
}
```

---

## Phase 6: Testing & Distribution (Week 7-8)

### 6.1 Build for All Platforms
```bash
# Mobile
flutter build apk --release  # Android
flutter build ios --release  # iOS

# Desktop
flutter build windows --release
flutter build macos --release
flutter build linux --release

# Web
flutter build web --release
```

### 6.2 Distribution

**Mobile:**
```bash
# Android: Play Store
# 1. Build app bundle
flutter build appbundle --release

# 2. Upload to Play Console
# https://play.google.com/console

# iOS: App Store
# 1. Open Xcode
open ios/Runner.xcworkspace

# 2. Archive and upload via Xcode
```

**Desktop:**
```bash
# Windows: Microsoft Store or standalone .exe
# Output: build/windows/runner/Release/

# macOS: Mac App Store or standalone .app
# Output: build/macos/Build/Products/Release/

# Linux: Snap Store
snapcraft
```

---

## Alternative: Quick Migration (Tauri + Capacitor)

If you want to reuse existing code (2-3 week migration):

### Desktop: Tauri Setup
```bash
npm install @tauri-apps/cli @tauri-apps/api
npx tauri init

# Edit src-tauri/tauri.conf.json
{
  "build": {
    "distDir": "../",  # Point to your app directory
    "devPath": "http://localhost:8000"
  }
}

# Build
npm run tauri build
```

### Mobile: Capacitor Setup
```bash
npm install @capacitor/core @capacitor/cli
npx cap init FinChronicle com.kirenlabs.finchronicle
npx cap add ios
npx cap add android

# Build
npx cap sync
npx cap open ios
npx cap open android
```

### Storage Adapter
```javascript
// storage-adapter.js - Works on desktop (Tauri) and mobile (Capacitor)
import { Store } from '@tauri-apps/plugin-store';  // Desktop
import { Preferences } from '@capacitor/preferences';  // Mobile

const isDesktop = window.__TAURI__ !== undefined;

export const storage = {
  async setItem(key, value) {
    if (isDesktop) {
      const store = new Store('.finchronicle.dat');
      await store.set(key, value);
    } else {
      await Preferences.set({ key, value: JSON.stringify(value) });
    }
  },

  async getItem(key) {
    if (isDesktop) {
      const store = new Store('.finchronicle.dat');
      return await store.get(key);
    } else {
      const { value } = await Preferences.get({ key });
      return value ? JSON.parse(value) : null;
    }
  }
};
```

---

## Decision Matrix

| Aspect | Flutter | Tauri + Capacitor |
|--------|---------|-------------------|
| **Time to Market** | 6-8 weeks | 2-3 weeks |
| **Code Reuse** | 0% (rewrite) | 95% (existing) |
| **Performance** | ⭐⭐⭐⭐⭐ Native | ⭐⭐⭐ WebView |
| **Bundle Size** | ~20MB | Desktop 5MB, Mobile 15MB |
| **UI Quality** | Perfect native | Good (web-like) |
| **Maintenance** | Single codebase | Two build systems |
| **Long-term** | Best for growth | Good for MVP |

---

## Recommendation

**Start with Flutter** for best long-term results:
- True universal app (one codebase)
- Best performance and UX
- Scales as features grow
- Worth the 6-8 week investment

**Choose Tauri + Capacitor** if:
- Need app in 2-3 weeks
- Want to preserve existing code
- Webview performance is acceptable
- Planning to rewrite later anyway

---

## Next Steps

1. **Decision:** Choose Flutter or Tauri+Capacitor
2. **Setup:** Install tools and create project
3. **Prototype:** Build one feature (e.g., transaction list) on all platforms
4. **Evaluate:** Test on real devices
5. **Commit:** Full migration based on prototype results

Would you like me to:
- Set up Flutter project structure?
- Create Tauri + Capacitor config?
- Build a working prototype of one screen?
