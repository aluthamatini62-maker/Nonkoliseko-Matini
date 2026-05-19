
export type UserRole = 'passenger' | 'driver' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  phoneNumber?: string;
  photoURL?: string;
  isVerified?: boolean;
  createdAt: string;
}

export interface DriverProfile {
  userId: string;
  vehicleModel: string;
  plateNumber: string;
  isOnline: boolean;
  currentLocation?: {
    lat: number;
    lng: number;
  };
  rating: number;
  totalRides: number;
  documentsApproved: boolean;
  activationFeePaid: boolean;
}

export type RideStatus = 'requested' | 'accepted' | 'arriving' | 'started' | 'completed' | 'cancelled';

export interface Location {
  address: string;
  lat: number;
  lng: number;
}

export interface Ride {
  id?: string;
  passengerId: string;
  driverId?: string;
  status: RideStatus;
  pickup: Location;
  destination: Location;
  price: number;
  paymentMethod: 'cash' | 'card';
  createdAt: string;
  acceptedAt?: string;
  completedAt?: string;
}
