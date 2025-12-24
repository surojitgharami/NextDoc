import { Drawer } from 'expo-router/drawer';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from 'react-native';
// Note: You need to install react-native-gesture-handler and reanimated
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function AppLayout() {
    // We can access color scheme, but simplifying to light for consistency for now
    const colors = Colors.light;

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <Drawer
                screenOptions={{
                    headerTintColor: colors.primary,
                    drawerActiveTintColor: colors.primary,
                    headerStyle: {
                        backgroundColor: colors.background,
                    },
                    drawerStyle: {
                        backgroundColor: colors.background,
                    }
                }}
            >
                <Drawer.Screen
                    name="dashboard"
                    options={{
                        drawerLabel: 'Dashboard',
                        title: 'AI Doctor',
                    }}
                />
                <Drawer.Screen
                    name="profile"
                    options={{
                        drawerLabel: 'My Profile',
                        title: 'Profile',
                    }}
                />
                <Drawer.Screen
                    name="chat"
                    options={{
                        drawerLabel: 'AI Chat',
                        title: 'Chat',
                        headerShown: false,
                    }}
                />
            </Drawer>
        </GestureHandlerRootView>
    );
}
