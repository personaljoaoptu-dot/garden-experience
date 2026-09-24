import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

void main() {
  runApp(const GardenExperienceApp());
}

class GardenExperienceApp extends StatelessWidget {
  const GardenExperienceApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Garden Experience — NPS System',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF090D12),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFE3B341),
          secondary: Color(0xFFF5C042),
          surface: Color(0xFF131B24),
        ),
        textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme),
      ),
      home: const MainNavigationShell(),
    );
  }
}

class MainNavigationShell extends StatefulWidget {
  const MainNavigationShell({super.key});

  @override
  State<MainNavigationShell> createState() => _MainNavigationShellState();
}

class _MainNavigationShellState extends State<MainNavigationShell> {
  int _selectedIndex = 0;

  final List<Widget> _pages = const [
    StudentSurveyView(),
    KioskTabletView(),
    AdminDashboardView(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF131B24),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFFE3B341),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Text(
                'G',
                style: TextStyle(
                  color: Colors.black,
                  fontWeight: FontWeight.bold,
                  fontSize: 20,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'GARDEN EXPERIENCE',
                  style: GoogleFonts.outfit(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                    color: const Color(0xFFE3B341),
                  ),
                ),
                const Text(
                  'Garden Gold Academia • NPS System',
                  style: TextStyle(fontSize: 11, color: Colors.grey),
                ),
              ],
            ),
          ],
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _buildNavBtn('Pesquisa Aluno', 0),
              _buildNavBtn('Modo Tablet Kiosk', 1),
              _buildNavBtn('Painel Admin', 2),
            ],
          ),
        ),
      ),
      body: _pages[_selectedIndex],
    );
  }

  Widget _buildNavBtn(String title, int index) {
    final isSelected = _selectedIndex == index;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
      child: TextButton(
        style: TextButton.styleFrom(
          backgroundColor: isSelected ? const Color(0xFFE3B341) : Colors.transparent,
          foregroundColor: isSelected ? Colors.black : Colors.white70,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
        onPressed: () => setState(() => _selectedIndex = index),
        child: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
      ),
    );
  }
}

class StudentSurveyView extends StatelessWidget {
  const StudentSurveyView({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Center(
        child: Container(
          maxWidth: 400,
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: const Color(0xFF131B24),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white10),
          ),
          child: Column(
            children: [
              const CircleAvatar(
                backgroundColor: Color(0xFFE3B341),
                radius: 24,
                child: Text('G', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 24)),
              ),
              const SizedBox(height: 12),
              Text(
                'GARDEN GOLD ACADEMIA',
                style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: const Color(0xFFE3B341)),
              ),
              const Text('Unidade A • Centro', style: TextStyle(color: Colors.grey, fontSize: 12)),
              const SizedBox(height: 24),
              const Text(
                'De 0 a 10, qual a probabilidade de você recomendar a Garden Gold a um amigo?',
                textAlign: TextAlign.center,
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
              ),
              const SizedBox(height: 20),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                alignment: WrapAlignment.center,
                children: List.generate(11, (index) {
                  Color btnColor = index >= 9
                      ? const Color(0xFF10B981)
                      : index >= 7
                          ? const Color(0xFFF59E0B)
                          : const Color(0xFFF43F5E);
                  return ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: btnColor,
                      foregroundColor: Colors.white,
                      minimumSize: const Size(44, 44),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    onPressed: () {},
                    child: Text('$index', style: const TextStyle(fontWeight: FontWeight.bold)),
                  );
                }),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class KioskTabletView extends StatelessWidget {
  const KioskTabletView({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            'SUA OPINIÃO MELHORA NOSSO TREINO',
            style: GoogleFonts.outfit(fontSize: 28, fontWeight: FontWeight.bold, color: const Color(0xFFE3B341)),
          ),
          const SizedBox(height: 8),
          const Text('Modo Kiosk Tablet • Garden Gold Academia', style: TextStyle(color: Colors.grey)),
          const SizedBox(height: 32),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFE3B341),
              foregroundColor: Colors.black,
              padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 20),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(40)),
            ),
            onPressed: () {},
            child: const Text('INICIAR PESQUISA', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}

class AdminDashboardView extends StatelessWidget {
  const AdminDashboardView({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _buildKpiCard('NPS SCORE GERAL', '+62', 'ZONA DE QUALIDADE', const Color(0xFFE3B341)),
              const SizedBox(width: 16),
              _buildKpiCard('TOTAL RESPOSTAS', '148', 'Pesquisas validadas', Colors.white),
              const SizedBox(width: 16),
              _buildKpiCard('PROMOTORES', '108 (73%)', 'Notas 9 e 10', const Color(0xFF10B981)),
              const SizedBox(width: 16),
              _buildKpiCard('DETRATORES', '16 (11%)', 'Notas 0 a 6', const Color(0xFFF43F5E)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildKpiCard(String title, String val, String sub, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFF131B24),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white10),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey)),
            const SizedBox(height: 8),
            Text(val, style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color)),
            const SizedBox(height: 4),
            Text(sub, style: const TextStyle(fontSize: 11, color: Colors.grey)),
          ],
        ),
      ),
    );
  }
}
