import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

export interface Location {
  address: string;
  lat: number;
  lng: number;
}

export interface RideRequest {
  id?: string;
  passengerId: string;
  driverId?: string;
  status: 'requested' | 'accepted' | 'arriving' | 'started' | 'completed' | 'cancelled';
  pickup: Location;
  destination: Location;
  price: number;
  paymentMethod: 'cash' | 'card';
  createdAt: string;
  acceptedAt?: string;
  completedAt?: string;
}

export const rideService = {
  async requestRide(request: Omit<RideRequest, 'id' | 'status' | 'createdAt'>) {
    const path = 'rides';
    try {
      const data = {
        ...request,
        status: 'requested',
        createdAt: new Date().toISOString(),
      };
      const docRef = await addDoc(collection(db, path), data);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async acceptRide(rideId: string, driverId: string) {
    const path = `rides/${rideId}`;
    try {
      await updateDoc(doc(db, 'rides', rideId), {
        status: 'accepted',
        driverId,
        acceptedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async updateRideStatus(rideId: string, status: RideRequest['status']) {
    const path = `rides/${rideId}`;
    try {
      const updateData: any = { status };
      if (status === 'completed') {
        updateData.completedAt = new Date().toISOString();
      }
      await updateDoc(doc(db, 'rides', rideId), updateData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  listenByPassenger(passengerId: string, callback: (rides: RideRequest[]) => void) {
    const q = query(
      collection(db, 'rides'),
      where('passengerId', '==', passengerId),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const rides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RideRequest));
      callback(rides);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'rides');
    });
  },

  listenByDriver(callback: (rides: RideRequest[]) => void) {
    const q = query(
      collection(db, 'rides'),
      where('status', '==', 'requested'),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const rides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RideRequest));
      callback(rides);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'rides');
    });
  },

  listenToRide(rideId: string, callback: (ride: RideRequest | null) => void) {
    return onSnapshot(doc(db, 'rides', rideId), (doc) => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() } as RideRequest);
      } else {
        callback(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `rides/${rideId}`);
    });
  }
};
